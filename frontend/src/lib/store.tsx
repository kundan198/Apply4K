import * as React from "react";
import type { ResumeProfile } from "@/types";
import { resumeApi } from "./api";

interface Store {
  resumes: ResumeProfile[];
  activeResumeId: number | null;
  activeResume: ResumeProfile | null;
  setActiveResumeId: (id: number) => void;
  refreshResumes: () => Promise<void>;
  addResume: (r: ResumeProfile) => void;
  loading: boolean;
}

const Ctx = React.createContext<Store | null>(null);
const ACTIVE_RESUME_KEY = "apply4k-active-resume-id";

export function useStore() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [resumes, setResumes] = React.useState<ResumeProfile[]>([]);
  const [activeResumeId, setActiveResumeId] = React.useState<number | null>(
    () => {
      const stored = Number(localStorage.getItem(ACTIVE_RESUME_KEY));
      return Number.isFinite(stored) && stored > 0 ? stored : null;
    },
  );
  const [loading, setLoading] = React.useState(true);

  const refreshResumes = React.useCallback(async () => {
    setLoading(true);
    const list = await resumeApi.list();
    setResumes(list);
    setActiveResumeId((prev) => {
      const next = prev && list.some((resume) => resume.id === prev) ? prev : list[0]?.id ?? null;
      if (next) localStorage.setItem(ACTIVE_RESUME_KEY, String(next));
      else localStorage.removeItem(ACTIVE_RESUME_KEY);
      return next;
    });
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void refreshResumes();
  }, [refreshResumes]);

  const addResume = React.useCallback((r: ResumeProfile) => {
    setResumes((prev) => [r, ...prev]);
    setActiveResumeId(r.id);
    localStorage.setItem(ACTIVE_RESUME_KEY, String(r.id));
  }, []);

  const selectActiveResume = React.useCallback((id: number) => {
    setActiveResumeId(id);
    localStorage.setItem(ACTIVE_RESUME_KEY, String(id));
  }, []);

  const activeResume =
    resumes.find((r) => r.id === activeResumeId) ?? resumes[0] ?? null;

  return (
    <Ctx.Provider
      value={{
        resumes,
        activeResumeId,
        activeResume,
        setActiveResumeId: selectActiveResume,
        refreshResumes,
        addResume,
        loading,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

// ---- Theme -----------------------------------------------------------------
export function useTheme() {
  const [theme, setTheme] = React.useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "dark";
    const saved = localStorage.getItem("aw-theme");
    if (saved === "light" || saved === "dark") return saved;
    return "dark";
  });

  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem("aw-theme", theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  return { theme, toggle };
}
