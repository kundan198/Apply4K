import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Wand2,
  MessageSquare,
  ListChecks,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/resume", label: "Resume", icon: FileText },
  { to: "/jobs", label: "Jobs", icon: Briefcase },
  { to: "/tailor", label: "Tailor", icon: Wand2 },
  { to: "/messages", label: "Messages", icon: MessageSquare },
  { to: "/tracker", label: "Tracker", icon: ListChecks },
  { to: "/legitimacy", label: "Legitimacy", icon: ShieldCheck },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-glow">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div className="leading-tight">
          <p className="font-semibold tracking-tight">Apply4K</p>
          <p className="text-[11px] font-medium text-muted-foreground">
            Kundan's job copilot
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={cn(
                    "h-[18px] w-[18px] transition-transform group-hover:scale-110",
                    isActive && "text-primary",
                  )}
                />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="m-3 rounded-2xl border border-border bg-gradient-to-br from-primary/10 to-violet-500/5 p-4">
        <p className="text-sm font-semibold">Pro tip</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Tailor your resume per role to lift your fit score above 85 and unlock
          the "Apply" recommendation.
        </p>
      </div>
    </div>
  );
}
