import * as React from "react";
import { Outlet } from "react-router-dom";
import { createPortal } from "react-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useTheme } from "@/lib/store";

export function Layout() {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { theme, toggle } = useTheme();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && setMobileOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="mission-grid flex min-h-screen bg-background">
      {/* Fixed desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-card/75 backdrop-blur-xl lg:block">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="absolute inset-y-0 left-0 w-64 border-r border-border bg-card shadow-card animate-slide-in">
              <Sidebar onNavigate={() => setMobileOpen(false)} />
            </aside>
          </div>,
          document.body,
        )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <Topbar
          onMenu={() => setMobileOpen(true)}
          theme={theme}
          toggleTheme={toggle}
        />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8 lg:py-8 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
