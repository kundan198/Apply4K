import { Menu, Moon, Sun, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { apiState } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { initials } from "@/lib/utils";

export function Topbar({
  onMenu,
  theme,
  toggleTheme,
}: {
  onMenu: () => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
}) {
  const { resumes, activeResumeId, setActiveResumeId, activeResume } =
    useStore();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/75 px-4 shadow-soft backdrop-blur-xl lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenu}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="relative hidden max-w-xs flex-1 sm:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          placeholder="Search jobs, companies…"
          className="h-10 w-full rounded-xl border border-input bg-card/70 pl-9 pr-3 text-sm shadow-soft placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        {apiState.usingMock && (
          <Badge variant="warning" className="hidden sm:inline-flex">
            Demo mode
          </Badge>
        )}

        {resumes.length > 0 && (
          <Select
            className="hidden h-10 w-56 md:block"
            value={activeResumeId ?? ""}
            onChange={(e) => setActiveResumeId(Number(e.target.value))}
            options={resumes.map((r) => ({
              value: String(r.id),
              label: r.filename,
            }))}
          />
        )}

        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="h-[18px] w-[18px]" />
          ) : (
            <Moon className="h-[18px] w-[18px]" />
          )}
        </Button>

        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-semibold text-white">
          {initials(activeResume?.candidate_name ?? "AW")}
        </div>
      </div>
    </header>
  );
}
