// Content script entry. Runs on supported job pages:
//  1. scrape the job
//  2. ask the background to score it
//  3. mount the overlay with the result (or an offline/error state)
//  4. wire Save / Generate message / Autofill actions
//  5. respond to popup-relayed REQUEST_SCRAPE / REQUEST_AUTOFILL messages

import { runAutofill } from "./autofill";
import { Overlay } from "./overlay";
import { scrapeCurrentPage } from "./scrapers";
import type {
  AutofillResult,
  BgResponse,
  ContentRequest,
  FitScore,
  Job,
  ResumeProfile,
  ScrapedJob
} from "../lib/types";

function send<T>(message: unknown): Promise<BgResponse<T>> {
  return chrome.runtime.sendMessage(message) as Promise<BgResponse<T>>;
}

let currentJob: ScrapedJob | null = null;
let currentScore: FitScore | null = null;
let overlay: Overlay | null = null;

async function doAutofill(): Promise<AutofillResult> {
  const res = await send<ResumeProfile | null>({ type: "GET_PROFILE" });
  const profile = res.ok ? res.data : null;
  return runAutofill(profile);
}

async function init() {
  // A scrape needs a meaningful title to be worth showing the overlay.
  currentJob = scrapeCurrentPage();
  if (!currentJob.title || !currentJob.description) {
    // Not a job detail page (e.g. LinkedIn jobs search list with nothing open).
    return;
  }

  overlay = new Overlay({
    onSave: async () => {
      const res = await send<Job>({
        type: "SAVE_JOB",
        job: currentJob,
        score: currentScore
      });
      if (!res.ok) {
        overlay?.setStatus(res.offline ? "offline" : "error", res.error);
      }
    },
    onGenerateMessage: async () => {
      const res = await send<{ content: string }>({
        type: "GENERATE_MESSAGE",
        job: currentJob,
        messageType: "recruiter_message"
      });
      if (res.ok) overlay?.showMessage(res.data.content);
      else overlay?.setStatus(res.offline ? "offline" : "error", res.error);
    },
    onAutofill: async () => {
      await doAutofill();
    }
  });

  overlay.setJob(currentJob);
  overlay.setLoading();

  const res = await send<FitScore>({ type: "SCORE_JOB", job: currentJob });
  if (res.ok) {
    currentScore = res.data;
    overlay.setScore(res.data);
  } else if (res.offline) {
    overlay.setStatus("offline");
  } else if (/no resume/i.test(res.error)) {
    overlay.setStatus("no-resume");
  } else {
    overlay.setStatus("error", res.error);
  }
}

// Respond to popup-driven requests relayed by the background worker.
chrome.runtime.onMessage.addListener(
  (req: ContentRequest, _sender, sendResponse) => {
    if (req.type === "REQUEST_SCRAPE") {
      const job = currentJob || scrapeCurrentPage();
      currentJob = job;
      sendResponse({ job, score: currentScore });
      return; // sync response
    }
    if (req.type === "REQUEST_AUTOFILL") {
      doAutofill().then(sendResponse);
      return true; // async response
    }
    return;
  }
);

// LinkedIn is a SPA — re-run when the job pane changes (URL or DOM).
let lastUrl = location.href;
const reinit = () => {
  if (location.href === lastUrl) return;
  lastUrl = location.href;
  overlay?.hide();
  overlay = null;
  currentScore = null;
  void init();
};
const obs = new MutationObserver(() => {
  if (location.href !== lastUrl) reinit();
});
obs.observe(document, { subtree: true, childList: true });

void init();
