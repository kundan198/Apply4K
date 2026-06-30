import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Dialog({
  open,
  onClose,
  children,
  className,
  side = "center",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  side?: "center" | "right";
}) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 m-auto w-full max-w-lg",
          side === "right" &&
            "ml-auto mr-0 h-full max-w-md rounded-none animate-slide-in",
          className,
        )}
      >
        <div
          className={cn(
            "relative rounded-2xl border border-border bg-card p-6 shadow-card animate-scale-in",
            side === "right" && "h-full overflow-y-auto rounded-none scrollbar-thin",
          )}
        >
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export const DialogTitle = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2
    className={cn("mb-1 text-lg font-semibold tracking-tight", className)}
    {...props}
  />
);

export const DialogDescription = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p
    className={cn("mb-4 text-sm text-muted-foreground", className)}
    {...props}
  />
);
