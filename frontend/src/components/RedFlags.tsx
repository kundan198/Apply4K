import { AlertTriangle, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function RedFlags({ flags }: { flags: string[] }) {
  if (!flags.length) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-500">
        <ShieldCheck className="h-4 w-4" />
        No red flags detected
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {flags.map((f) => (
        <Badge key={f} variant="danger">
          <AlertTriangle className="h-3 w-3" />
          {f}
        </Badge>
      ))}
    </div>
  );
}
