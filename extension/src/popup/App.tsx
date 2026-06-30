import { useEffect, useState } from "react";
import {
  DEFAULT_SETTINGS,
  scoreBand,
  type AutofillResult,
  type BgResponse,
  type FitScore,
  type Job,
  type ResumeSummary,
  type ScrapedJob,
  type Settings
} from "../lib/types";

function send<T>(message: unknown): Promise<BgResponse<T>> {
  return chrome.runtime.sendMessage(message) as Promise<BgResponse<T>>;
}

const BAND_COLOR: Record<string, string> = {
  good: "#10b981",
  warn: "#f59e0b",
  bad: "#ef4444"
};

function ScoreRing({ total }: { total: number }) {
  const band = scoreBand(total);
  const color = BAND_COLOR[band];
  const r = 30;
  const c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, total)) / 100) * c;
  return (
    <div className="relative h-[72px] w-[72px] shrink-0">
      <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="7" />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <b className="text-xl font-extrabold" style={{ color }}>
          {Math.round(total)}
        </b>
        <span className="text-[9px] text-[#9fb0e0]">/ 100</span>
      </div>
    </div>
  );
}

type Toast = { kind: "ok" | "err"; text: string } | null;

export function App() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [resumes, setResumes] = useState<ResumeSummary[]>([]);
  const [job, setJob] = useState<ScrapedJob | null>(null);
  const [score, setScore] = useState<FitScore | null>(null);
  const [status, setStatus] = useState<string>("Loading…");
  const [offline, setOffline] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [toast, setToast] = useState<Toast>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const flash = (t: Toast) => {
    setToast(t);
    if (t) setTimeout(() => setToast(null), 3000);
  };

  // Load settings + resumes + scrape current tab on open.
  useEffect(() => {
    void (async () => {
      const s = await send<Settings>({ type: "GET_SETTINGS" });
      if (s.ok) setSettings(s.data);

      const r = await send<ResumeSummary[]>({ type: "LIST_RESUMES" });
      if (r.ok) setResumes(r.data);
      else if (r.offline) setOffline(true);

      const scraped = await send<{ job: ScrapedJob; score: FitScore | null }>({
        type: "REQUEST_SCRAPE"
      });
      if (scraped.ok && scraped.data?.job) {
        setJob(scraped.data.job);
        if (scraped.data.score) setScore(scraped.data.score);
        setStatus("");
        // If we have a job but no score yet, request one.
        if (!scraped.data.score) void requestScore(scraped.data.job);
      } else {
        setStatus("Open a LinkedIn / Greenhouse / Lever / Ashby job page.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function requestScore(j: ScrapedJob) {
    setStatus("Scoring…");
    const res = await send<FitScore>({ type: "SCORE_JOB", job: j });
    if (res.ok) {
      setScore(res.data);
      setStatus("");
      setOffline(false);
    } else if (res.offline) {
      setOffline(true);
      setStatus("");
    } else {
      setStatus(res.error);
    }
  }

  async function saveSetting(patch: Partial<Settings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    const res = await send<Settings>({ type: "SET_SETTINGS", settings: patch });
    if (res.ok) setSettings(res.data);
    // Re-list resumes / rescore when the API base or resume changes.
    if (patch.apiBase !== undefined) {
      const r = await send<ResumeSummary[]>({ type: "LIST_RESUMES" });
      if (r.ok) {
        setResumes(r.data);
        setOffline(false);
      } else if (r.offline) setOffline(true);
    }
    if (patch.resumeId !== undefined && job) void requestScore(job);
  }

  async function onSave() {
    if (!job) return;
    setBusy("save");
    const res = await send<Job>({ type: "SAVE_JOB", job, score });
    setBusy(null);
    if (res.ok) flash({ kind: "ok", text: "Saved to dashboard." });
    else flash({ kind: "err", text: res.error });
  }

  async function onGenerate() {
    if (!job) return;
    setBusy("msg");
    const res = await send<{ content: string }>({
      type: "GENERATE_MESSAGE",
      job,
      messageType: "recruiter_message"
    });
    setBusy(null);
    if (res.ok) setMessage(res.data.content);
    else flash({ kind: "err", text: res.error });
  }

  async function onAutofill() {
    setBusy("autofill");
    const res = await send<AutofillResult>({ type: "REQUEST_AUTOFILL" });
    setBusy(null);
    if (res.ok)
      flash({
        kind: "ok",
        text: `Filled ${res.data.filled} field${res.data.filled === 1 ? "" : "s"} — review & submit yourself.`
      });
    else flash({ kind: "err", text: res.error });
  }

  const band = score ? scoreBand(score.total) : "warn";
  const noResume = settings.resumeId == null;

  return (
    <div className="font-sans text-[13px]">
      {/* Header */}
      <div className="flex items-center gap-2 bg-gradient-to-r from-brand-700 to-brand-500 px-4 py-3">
        <span className="text-[15px] font-extrabold tracking-wide">
          Apply4K <span className="font-semibold opacity-80">AI</span>
        </span>
        <button
          className="ml-auto rounded-md bg-white/20 px-2 py-1 text-[11px] font-semibold"
          onClick={() => setShowSettings((v) => !v)}
        >
          {showSettings ? "Done" : "Settings"}
        </button>
      </div>

      <div className="p-4">
        {/* Settings panel */}
        {showSettings && (
          <div className="mb-4 rounded-xl border border-white/10 bg-panel p-3">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#7f8fc4]">
              API base URL
            </div>
            <input
              className="mb-3 w-full rounded-lg border border-white/10 bg-[#0e1430] px-3 py-2 text-[12px] outline-none focus:border-brand-500"
              value={settings.apiBase}
              onChange={(e) => setSettings({ ...settings, apiBase: e.target.value })}
              onBlur={(e) => void saveSetting({ apiBase: e.target.value })}
              placeholder="http://localhost:8000"
            />
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#7f8fc4]">
              Resume
            </div>
            <select
              className="w-full rounded-lg border border-white/10 bg-[#0e1430] px-3 py-2 text-[12px] outline-none focus:border-brand-500"
              value={settings.resumeId ?? ""}
              onChange={(e) =>
                void saveSetting({
                  resumeId: e.target.value ? Number(e.target.value) : null
                })
              }
            >
              <option value="">— Select a resume —</option>
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.candidate_name || r.filename} (#{r.id})
                </option>
              ))}
            </select>
            {offline && (
              <p className="mt-2 text-[11px] text-warn">
                Backend offline — start Apply4K API to load resumes.
              </p>
            )}
          </div>
        )}

        {/* Offline banner */}
        {offline && !showSettings && (
          <div className="mb-3 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-[12px] text-[#ffe2b0]">
            Backend offline — start Apply4K API. Job details still shown.
          </div>
        )}
        {noResume && !showSettings && (
          <div className="mb-3 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-[12px] text-[#ffe2b0]">
            No resume selected.{" "}
            <button className="underline" onClick={() => setShowSettings(true)}>
              Choose one in Settings
            </button>{" "}
            to get a fit score.
          </div>
        )}

        {/* Job + score */}
        {job ? (
          <>
            <div className="text-[14px] font-bold leading-snug">{job.title}</div>
            <div className="mt-0.5 text-[12px] text-[#9fb0e0]">
              {job.company}
              {job.location ? ` · ${job.location}` : ""}
              {job.easy_apply ? " · Easy Apply" : ""}
            </div>

            {score ? (
              <div className="my-4 flex items-center gap-3">
                <ScoreRing total={score.total} />
                <div className="flex-1">
                  <span
                    className="inline-block rounded-full px-3 py-1 text-[13px] font-extrabold"
                    style={{
                      background: `${BAND_COLOR[band]}22`,
                      color: BAND_COLOR[band],
                      border: `1px solid ${BAND_COLOR[band]}66`
                    }}
                  >
                    {score.recommendation}
                  </span>
                  <p className="mt-2 max-h-16 overflow-auto text-[11px] leading-relaxed text-[#aebbe6]">
                    {score.reasoning}
                  </p>
                </div>
              </div>
            ) : (
              status && <p className="my-4 text-[12px] text-[#9fb0e0]">{status}</p>
            )}

            {score && score.red_flags.length > 0 && (
              <>
                <div className="mb-1.5 mt-3 text-[10px] font-bold uppercase tracking-wide text-[#7f8fc4]">
                  Red flags
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {score.red_flags.slice(0, 6).map((f, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-bad/50 bg-bad/10 px-2.5 py-1 text-[11px] text-[#ffd9d4]"
                    >
                      ⚑ {f}
                    </span>
                  ))}
                </div>
              </>
            )}

            {score && score.matched_skills.length > 0 && (
              <>
                <div className="mb-1.5 mt-3 text-[10px] font-bold uppercase tracking-wide text-[#7f8fc4]">
                  Matched skills
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {score.matched_skills.slice(0, 10).map((s, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-good/40 bg-good/10 px-2.5 py-1 text-[11px] text-[#c9f5e4]"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </>
            )}

            {/* Actions */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                className="rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 px-3 py-2 text-[12px] font-bold text-white disabled:opacity-50"
                onClick={onSave}
                disabled={busy === "save"}
              >
                {busy === "save" ? "Saving…" : "Save to dashboard"}
              </button>
              <button
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[12px] font-bold disabled:opacity-50"
                onClick={onGenerate}
                disabled={busy === "msg"}
              >
                {busy === "msg" ? "Writing…" : "Recruiter message"}
              </button>
              <button
                className="col-span-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[12px] font-bold disabled:opacity-50"
                onClick={onAutofill}
                disabled={busy === "autofill"}
              >
                {busy === "autofill" ? "Filling…" : "Autofill this page (no submit)"}
              </button>
            </div>

            {message && (
              <div className="mt-3">
                <textarea
                  readOnly
                  className="h-28 w-full resize-y rounded-lg border border-white/10 bg-[#0e1430] p-2 text-[11.5px]"
                  value={message}
                />
                <button
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[12px] font-bold"
                  onClick={() => {
                    void navigator.clipboard.writeText(message);
                    flash({ kind: "ok", text: "Message copied." });
                  }}
                >
                  Copy message
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="py-6 text-center text-[12px] text-[#9fb0e0]">{status}</p>
        )}

        {/* No-submit guarantee */}
        <div className="mt-4 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-[#8aa0d8]">
          <span>🛡️</span>
          <span>
            Apply4K fills forms but <b>never submits</b>. You review and click
            submit yourself.
          </span>
        </div>
      </div>

      {toast && (
        <div
          className={`fixed bottom-3 left-1/2 -translate-x-1/2 rounded-lg px-3 py-2 text-[12px] font-semibold ${
            toast.kind === "ok"
              ? "bg-good/20 text-[#c9f5e4]"
              : "bg-bad/20 text-[#ffd9d4]"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
