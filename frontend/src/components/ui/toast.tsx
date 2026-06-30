import * as React from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info";
interface ToastItem {
  id: number;
  title: string;
  description?: string;
  kind: ToastKind;
}

interface ToastCtx {
  toast: (t: Omit<ToastItem, "id">) => void;
}
const Ctx = React.createContext<ToastCtx | null>(null);

export function useToast() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const icons: Record<ToastKind, React.ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
  error: <AlertTriangle className="h-5 w-5 text-rose-500" />,
  info: <Info className="h-5 w-5 text-primary" />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  const toast = React.useCallback((t: Omit<ToastItem, "id">) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { ...t, id }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id: number) =>
    setItems((prev) => prev.filter((i) => i.id !== id));

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      {createPortal(
        <div className="fixed bottom-5 right-5 z-[60] flex w-full max-w-sm flex-col gap-2.5">
          {items.map((i) => (
            <div
              key={i.id}
              className={cn(
                "flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-card animate-scale-in",
              )}
            >
              <div className="mt-0.5">{icons[i.kind]}</div>
              <div className="flex-1">
                <p className="text-sm font-medium">{i.title}</p>
                {i.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {i.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => dismiss(i.id)}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </Ctx.Provider>
  );
}
