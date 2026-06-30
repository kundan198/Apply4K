// SAFE autofill. Fills common application fields from the cached resume
// profile, highlights what it touched, and shows a persistent banner.
//
// CRITICAL SAFETY RULE: this module NEVER clicks a submit button and NEVER
// calls form.submit(). It only sets the value of input/textarea fields and
// dispatches input/change events so React-controlled forms register them.
// The user must review and submit every application themselves.

import type { AutofillResult, ResumeProfile } from "../lib/types";

type FieldKind =
  | "name"
  | "first_name"
  | "last_name"
  | "email"
  | "phone"
  | "linkedin"
  | "github"
  | "portfolio";

// Keyword patterns matched against a field's name/id/label/placeholder text.
const PATTERNS: Record<FieldKind, RegExp> = {
  first_name: /\b(first[\s_-]?name|fname|given[\s_-]?name)\b/i,
  last_name: /\b(last[\s_-]?name|lname|surname|family[\s_-]?name)\b/i,
  name: /\b(full[\s_-]?name|your[\s_-]?name|candidate[\s_-]?name|^name$|\bname\b)\b/i,
  email: /\b(e[\s_-]?mail)\b/i,
  phone: /\b(phone|mobile|tel|cell)\b/i,
  linkedin: /\b(linkedin)\b/i,
  github: /\b(github|git[\s_-]?hub)\b/i,
  portfolio: /\b(portfolio|website|personal[\s_-]?site|url)\b/i
};

function labelTextFor(input: HTMLInputElement | HTMLTextAreaElement): string {
  const parts: string[] = [
    input.name,
    input.id,
    input.getAttribute("placeholder") || "",
    input.getAttribute("aria-label") || "",
    input.getAttribute("autocomplete") || ""
  ];
  // <label for=id>
  if (input.id) {
    const lbl = document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
    if (lbl?.textContent) parts.push(lbl.textContent);
  }
  // wrapping <label>
  const wrap = input.closest("label");
  if (wrap?.textContent) parts.push(wrap.textContent);
  return parts.join(" ").toLowerCase();
}

function classify(
  input: HTMLInputElement | HTMLTextAreaElement
): FieldKind | null {
  const type = (input.getAttribute("type") || "text").toLowerCase();
  if (["password", "hidden", "file", "checkbox", "radio", "submit", "button"].includes(type))
    return null;
  if (type === "email") return "email";
  if (type === "tel") return "phone";

  const hay = labelTextFor(input);
  // Order matters: first/last before generic name.
  const ordered: FieldKind[] = [
    "first_name",
    "last_name",
    "email",
    "phone",
    "linkedin",
    "github",
    "portfolio",
    "name"
  ];
  for (const kind of ordered) {
    if (PATTERNS[kind].test(hay)) return kind;
  }
  return null;
}

function valueFor(kind: FieldKind, p: ResumeProfile): string | null {
  const nameParts = (p.candidate_name || "").trim().split(/\s+/);
  switch (kind) {
    case "name":
      return p.candidate_name || null;
    case "first_name":
      return nameParts[0] || null;
    case "last_name":
      return nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;
    case "email":
      return p.email;
    case "phone":
      return p.phone;
    case "linkedin":
      return p.links?.linkedin || null;
    case "github":
      return p.links?.github || null;
    case "portfolio":
      return p.links?.portfolio || null;
    default:
      return null;
  }
}

// Set value in a way React/controlled inputs detect.
function setValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function highlight(el: HTMLElement) {
  el.style.transition = "box-shadow .2s, background-color .2s";
  el.style.boxShadow = "0 0 0 2px #3b6cff, 0 0 0 4px rgba(59,108,255,.25)";
  el.style.backgroundColor = "rgba(59,108,255,.06)";
  setTimeout(() => {
    el.style.boxShadow = "";
    el.style.backgroundColor = "";
  }, 4000);
}

const BANNER_ID = "apply4k-autofill-banner";

function showBanner(filled: number) {
  document.getElementById(BANNER_ID)?.remove();
  const bar = document.createElement("div");
  bar.id = BANNER_ID;
  Object.assign(bar.style, {
    position: "fixed",
    top: "0",
    left: "0",
    right: "0",
    zIndex: "2147483647",
    background: "linear-gradient(90deg,#1f43c4,#3b6cff)",
    color: "#fff",
    font: "600 13px/1.4 Inter,-apple-system,Segoe UI,Roboto,sans-serif",
    padding: "10px 16px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    boxShadow: "0 4px 20px rgba(0,0,0,.25)"
  } as CSSStyleDeclaration);

  const safety = document.createElement("span");
  safety.textContent = `🛡️ Review every field — Apply4K never submits for you. (${filled} field${filled === 1 ? "" : "s"} filled)`;

  const close = document.createElement("button");
  close.textContent = "Dismiss";
  Object.assign(close.style, {
    marginLeft: "auto",
    background: "rgba(255,255,255,.18)",
    border: "0",
    color: "#fff",
    borderRadius: "6px",
    padding: "4px 10px",
    cursor: "pointer",
    font: "600 12px Inter,sans-serif"
  } as CSSStyleDeclaration);
  close.addEventListener("click", () => bar.remove());

  bar.append(safety, close);
  document.body.appendChild(bar);
}

export function runAutofill(profile: ResumeProfile | null): AutofillResult {
  if (!profile) {
    showBanner(0);
    return { filled: 0, fields: [] };
  }

  const inputs = Array.from(
    document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      "input, textarea"
    )
  );
  const filledKinds = new Set<FieldKind>();
  const filledLabels: string[] = [];

  for (const input of inputs) {
    if (input.disabled || input.readOnly) continue;
    // Skip if the field already has a user-entered value.
    if (input.value && input.value.trim()) continue;
    const kind = classify(input);
    if (!kind) continue;
    const value = valueFor(kind, profile);
    if (!value) continue;
    setValue(input, value);
    highlight(input);
    if (!filledKinds.has(kind)) {
      filledKinds.add(kind);
      filledLabels.push(kind);
    }
  }

  // SAFETY: we intentionally do NOT touch submit buttons or call .submit().
  showBanner(filledLabels.length);
  return { filled: filledLabels.length, fields: filledLabels };
}
