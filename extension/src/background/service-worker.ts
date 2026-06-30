// Apply4K — background service worker (MV3).
// Single message broker: content scripts and the popup talk only to here.
// Responsibilities:
//  - persist settings (apiBase, resumeId) and cache the resume profile in chrome.storage
//  - call the backend (host_permissions cover localhost:8000)
//  - relay popup -> active tab content-script requests (scrape / autofill)

import { ApiOfflineError, api } from "../lib/api";
import {
  DEFAULT_SETTINGS,
  type BgRequest,
  type BgResponse,
  type ResumeProfile,
  type Settings
} from "../lib/types";

const SETTINGS_KEY = "apply4k_settings";
const PROFILE_KEY = "apply4k_profile_cache";

async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(stored[SETTINGS_KEY] || {}) };
}

async function setSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await getSettings()), ...patch };
  await chrome.storage.local.set({ [SETTINGS_KEY]: next });
  // Resume changed -> refresh the cached profile (best effort).
  if (patch.resumeId !== undefined) {
    void refreshProfileCache(next).catch(() => undefined);
  }
  return next;
}

// Caches /api/resume/{id} so autofill works even if a request is slow.
async function refreshProfileCache(
  settings: Settings
): Promise<ResumeProfile | null> {
  if (settings.resumeId == null) {
    await chrome.storage.local.remove(PROFILE_KEY);
    return null;
  }
  const profile = await api.getResume(settings.apiBase, settings.resumeId);
  await chrome.storage.local.set({ [PROFILE_KEY]: profile });
  return profile;
}

async function getCachedProfile(): Promise<ResumeProfile | null> {
  const settings = await getSettings();
  // Try fresh first, fall back to cache when offline.
  try {
    return await refreshProfileCache(settings);
  } catch {
    const stored = await chrome.storage.local.get(PROFILE_KEY);
    return (stored[PROFILE_KEY] as ResumeProfile) ?? null;
  }
}

// Relay a message to the active tab's content script and await its reply.
async function relayToActiveTab<T>(message: unknown): Promise<T> {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });
  if (!tab?.id) throw new Error("No active tab");
  return (await chrome.tabs.sendMessage(tab.id, message)) as T;
}

function errResponse(e: unknown): BgResponse<never> {
  if (e instanceof ApiOfflineError) {
    return { ok: false, error: "Backend offline — start Apply4K API", offline: true };
  }
  return { ok: false, error: e instanceof Error ? e.message : String(e) };
}

async function handle(req: BgRequest): Promise<BgResponse<unknown>> {
  const settings = await getSettings();

  switch (req.type) {
    case "GET_SETTINGS":
      return { ok: true, data: settings };

    case "SET_SETTINGS":
      return { ok: true, data: await setSettings(req.settings) };

    case "LIST_RESUMES":
      try {
        return { ok: true, data: await api.listResumes(settings.apiBase) };
      } catch (e) {
        return errResponse(e);
      }

    case "GET_PROFILE":
      try {
        return { ok: true, data: await getCachedProfile() };
      } catch (e) {
        return errResponse(e);
      }

    case "SCORE_JOB":
      if (settings.resumeId == null) {
        return { ok: false, error: "No resume selected. Set a resume in the popup settings." };
      }
      try {
        const score = await api.scoreJob(
          settings.apiBase,
          settings.resumeId,
          req.job
        );
        return { ok: true, data: score };
      } catch (e) {
        return errResponse(e);
      }

    case "SAVE_JOB":
      try {
        const job = await api.saveJob(settings.apiBase, req.job, req.score);
        await api.saveApplication(settings.apiBase, req.job, req.score);
        return { ok: true, data: job };
      } catch (e) {
        return errResponse(e);
      }

    case "GENERATE_MESSAGE":
      if (settings.resumeId == null) {
        return { ok: false, error: "No resume selected. Set a resume in the popup settings." };
      }
      try {
        const result = await api.generateMessage(
          settings.apiBase,
          settings.resumeId,
          req.job,
          req.messageType,
          req.recruiterName
        );
        return { ok: true, data: result };
      } catch (e) {
        return errResponse(e);
      }

    case "REQUEST_SCRAPE":
      try {
        return { ok: true, data: await relayToActiveTab({ type: "REQUEST_SCRAPE" }) };
      } catch (e) {
        return errResponse(e);
      }

    case "REQUEST_AUTOFILL":
      try {
        return { ok: true, data: await relayToActiveTab({ type: "REQUEST_AUTOFILL" }) };
      } catch (e) {
        return errResponse(e);
      }

    default:
      return { ok: false, error: "Unknown request" };
  }
}

chrome.runtime.onMessage.addListener((req: BgRequest, _sender, sendResponse) => {
  handle(req)
    .then(sendResponse)
    .catch((e) => sendResponse(errResponse(e)));
  return true; // keep the channel open for the async response
});
