// On-page floating score card, rendered inside a shadow root so the host
// page's CSS can never clash with ours. Vanilla DOM (no React) to keep the
// content bundle tiny and load-safe.

import {
  scoreBand,
  type FitScore,
  type ScrapedJob
} from "../lib/types";

const HOST_ID = "apply4k-overlay-host";

export interface OverlayCallbacks {
  onSave: () => void | Promise<void>;
  onGenerateMessage: () => void | Promise<void>;
  onAutofill: () => void | Promise<void>;
}

interface OverlayState {
  job: ScrapedJob | null;
  score: FitScore | null;
  status: "loading" | "ready" | "offline" | "error" | "no-resume";
  message?: string;
}

const BAND_COLORS = {
  good: "#10b981",
  warn: "#f59e0b",
  bad: "#ef4444"
} as const;

const STYLE = `
:host { all: initial; }
* { box-sizing: border-box; font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
.card {
  position: fixed; top: 84px; right: 20px; width: 320px; z-index: 2147483646;
  background: #0b1020; color: #e7ecff; border: 1px solid rgba(255,255,255,.08);
  border-radius: 16px; box-shadow: 0 18px 50px -12px rgba(0,0,0,.6), 0 0 0 1px rgba(59,108,255,.15);
  overflow: hidden; backdrop-filter: blur(6px); animation: slidein .25s ease;
}
@keyframes slidein { from { opacity: 0; transform: translateY(-8px);} to {opacity:1; transform:none;} }
.header { display:flex; align-items:center; gap:8px; padding:12px 14px; background: linear-gradient(90deg,#1f43c4,#3b6cff); }
.logo { font-weight:800; font-size:13px; letter-spacing:.3px; }
.logo .ai { opacity:.85; font-weight:600; }
.close { margin-left:auto; cursor:pointer; border:0; background:rgba(255,255,255,.18); color:#fff; width:24px; height:24px; border-radius:7px; font-size:14px; line-height:1; }
.body { padding:14px; }
.job-title { font-size:14px; font-weight:700; line-height:1.3; }
.job-meta { font-size:12px; color:#9fb0e0; margin-top:2px; }
.scorewrap { display:flex; align-items:center; gap:14px; margin:14px 0; }
.ring { position:relative; width:84px; height:84px; flex:0 0 auto; }
.ring svg { transform: rotate(-90deg); }
.ring .num { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; }
.ring .num b { font-size:22px; font-weight:800; }
.ring .num span { font-size:10px; color:#9fb0e0; }
.rec { flex:1; }
.rec .banner { display:inline-block; padding:5px 12px; border-radius:999px; font-size:13px; font-weight:800; }
.rec .reason { font-size:11.5px; color:#aebbe6; margin-top:8px; line-height:1.45; max-height:64px; overflow:auto; }
.section-title { font-size:10.5px; text-transform:uppercase; letter-spacing:.6px; color:#7f8fc4; margin:12px 0 6px; font-weight:700; }
.chips { display:flex; flex-wrap:wrap; gap:6px; }
.chip { font-size:11px; padding:3px 9px; border-radius:999px; border:1px solid rgba(255,255,255,.12); color:#cdd7ff; background:rgba(255,255,255,.04); }
.chip.flag { color:#ffd9d4; border-color:rgba(239,68,68,.5); background:rgba(239,68,68,.12); }
.chip.match { color:#c9f5e4; border-color:rgba(16,185,129,.45); background:rgba(16,185,129,.12); }
.actions { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:14px; }
.btn { border:0; border-radius:10px; padding:9px 10px; font-size:12px; font-weight:700; cursor:pointer; transition:.15s; }
.btn:hover { transform: translateY(-1px); }
.btn:disabled { opacity:.5; cursor:default; transform:none; }
.btn.primary { background: linear-gradient(90deg,#2a55e6,#3b6cff); color:#fff; }
.btn.ghost { background: rgba(255,255,255,.07); color:#dfe6ff; border:1px solid rgba(255,255,255,.1); }
.btn.full { grid-column:1 / -1; }
.note { margin-top:10px; font-size:10.5px; color:#8aa0d8; display:flex; gap:6px; align-items:flex-start; line-height:1.4; }
.statusline { font-size:12px; padding:10px 12px; border-radius:10px; margin:6px 0; }
.status-offline { background:rgba(245,158,11,.14); color:#ffe2b0; border:1px solid rgba(245,158,11,.4); }
.status-error { background:rgba(239,68,68,.14); color:#ffd9d4; border:1px solid rgba(239,68,68,.4); }
.status-loading { background:rgba(59,108,255,.14); color:#cdd9ff; border:1px solid rgba(59,108,255,.4); }
.msgbox { margin-top:10px; }
.msgbox textarea { width:100%; height:120px; resize:vertical; font-size:11.5px; border-radius:8px; border:1px solid rgba(255,255,255,.12); background:#0e1430; color:#e7ecff; padding:8px; }
.spinner { display:inline-block; width:14px; height:14px; border:2px solid rgba(255,255,255,.3); border-top-color:#fff; border-radius:50%; animation:spin .7s linear infinite; vertical-align:-2px; }
@keyframes spin { to { transform: rotate(360deg);} }
`;

export class Overlay {
  private host: HTMLElement;
  private root: ShadowRoot;
  private state: OverlayState = { job: null, score: null, status: "loading" };
  private cb: OverlayCallbacks;

  constructor(cb: OverlayCallbacks) {
    this.cb = cb;
    this.host = document.getElementById(HOST_ID) || document.createElement("div");
    this.host.id = HOST_ID;
    if (!this.host.isConnected) document.documentElement.appendChild(this.host);
    this.root = this.host.shadowRoot || this.host.attachShadow({ mode: "open" });
  }

  setJob(job: ScrapedJob) {
    this.state.job = job;
    this.render();
  }

  setLoading() {
    this.state.status = "loading";
    this.render();
  }

  setScore(score: FitScore) {
    this.state.score = score;
    this.state.status = "ready";
    this.render();
  }

  setStatus(status: OverlayState["status"], message?: string) {
    this.state.status = status;
    this.state.message = message;
    this.render();
  }

  showMessage(content: string) {
    const box = this.root.querySelector("#msgbox") as HTMLElement | null;
    if (!box) return;
    box.innerHTML = "";
    const ta = document.createElement("textarea");
    ta.readOnly = true;
    ta.value = content;
    const copy = document.createElement("button");
    copy.className = "btn ghost full";
    copy.textContent = "Copy message";
    copy.style.marginTop = "6px";
    copy.addEventListener("click", () => {
      void navigator.clipboard.writeText(content);
      copy.textContent = "Copied!";
      setTimeout(() => (copy.textContent = "Copy message"), 1500);
    });
    box.append(ta, copy);
  }

  private ring(total: number): string {
    const band = scoreBand(total);
    const color = BAND_COLORS[band];
    const r = 36;
    const c = 2 * Math.PI * r;
    const dash = (Math.max(0, Math.min(100, total)) / 100) * c;
    return `
      <div class="ring">
        <svg width="84" height="84" viewBox="0 0 84 84">
          <circle cx="42" cy="42" r="${r}" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="8"/>
          <circle cx="42" cy="42" r="${r}" fill="none" stroke="${color}" stroke-width="8"
            stroke-linecap="round" stroke-dasharray="${dash} ${c}"/>
        </svg>
        <div class="num"><b style="color:${color}">${Math.round(total)}</b><span>/ 100</span></div>
      </div>`;
  }

  private render() {
    const { job, score, status, message } = this.state;
    const escape = (s: string) =>
      s.replace(/[&<>"]/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string)
      );

    let scoreBlock = "";
    if (status === "loading") {
      scoreBlock = `<div class="statusline status-loading"><span class="spinner"></span> Scoring this job…</div>`;
    } else if (status === "offline") {
      scoreBlock = `<div class="statusline status-offline">⚠️ Backend offline — start Apply4K API. Job details still shown below.</div>`;
    } else if (status === "no-resume") {
      scoreBlock = `<div class="statusline status-offline">⚙️ No resume selected. Open the Apply4K popup → Settings to pick a resume.</div>`;
    } else if (status === "error") {
      scoreBlock = `<div class="statusline status-error">${escape(message || "Something went wrong.")}</div>`;
    } else if (score) {
      const band = scoreBand(score.total);
      const color = BAND_COLORS[band];
      const flags = score.red_flags
        .slice(0, 6)
        .map((f) => `<span class="chip flag">⚑ ${escape(f)}</span>`)
        .join("");
      const matched = score.matched_skills
        .slice(0, 8)
        .map((s) => `<span class="chip match">${escape(s)}</span>`)
        .join("");
      scoreBlock = `
        <div class="scorewrap">
          ${this.ring(score.total)}
          <div class="rec">
            <span class="banner" style="background:${color}22;color:${color};border:1px solid ${color}66">${escape(score.recommendation)}</span>
            <div class="reason">${escape(score.reasoning || "")}</div>
          </div>
        </div>
        ${flags ? `<div class="section-title">Red flags</div><div class="chips">${flags}</div>` : ""}
        ${matched ? `<div class="section-title">Matched skills</div><div class="chips">${matched}</div>` : ""}
      `;
    }

    this.root.innerHTML = `
      <style>${STYLE}</style>
      <div class="card">
        <div class="header">
          <span class="logo">Apply4K <span class="ai">AI</span></span>
          <button class="close" id="aw-close" title="Close">×</button>
        </div>
        <div class="body">
          ${
            job
              ? `<div class="job-title">${escape(job.title || "Untitled role")}</div>
                 <div class="job-meta">${escape(job.company || "")}${job.location ? " · " + escape(job.location) : ""}${job.easy_apply ? " · Easy Apply" : ""}</div>`
              : `<div class="job-title">Reading job…</div>`
          }
          ${scoreBlock}
          <div class="actions">
            <button class="btn primary" id="aw-save">Save to dashboard</button>
            <button class="btn ghost" id="aw-msg">Recruiter message</button>
            <button class="btn ghost full" id="aw-autofill">Autofill this page (no submit)</button>
          </div>
          <div id="msgbox" class="msgbox"></div>
          <div class="note">🛡️ <span>Apply4K fills forms but <b>never submits</b>. You review and click submit yourself.</span></div>
        </div>
      </div>
    `;

    this.root.getElementById("aw-close")?.addEventListener("click", () => this.hide());
    this.bindAction("aw-save", () => this.cb.onSave());
    this.bindAction("aw-msg", () => this.cb.onGenerateMessage());
    this.bindAction("aw-autofill", () => this.cb.onAutofill());
  }

  private bindAction(id: string, fn: () => void | Promise<void>) {
    const el = this.root.getElementById(id) as HTMLButtonElement | null;
    if (!el) return;
    el.addEventListener("click", async () => {
      const original = el.textContent;
      el.disabled = true;
      el.textContent = "Working…";
      try {
        await fn();
      } finally {
        el.disabled = false;
        el.textContent = original;
      }
    });
  }

  hide() {
    this.host.remove();
  }
}
