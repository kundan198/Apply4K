import * as React from "react";
import type { LegitimacyReport, LegitimacyVerdict } from "@/types";
import { legitimacyApi } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { PageHeader, Spinner } from "@/components/common";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScoreRing } from "@/components/ScoreRing";
import { cn } from "@/lib/utils";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Check,
  X,
  Search,
} from "lucide-react";

const VERDICT: Record<
  LegitimacyVerdict,
  { icon: React.ReactNode; cls: string; sub: string }
> = {
  Legit: {
    icon: <ShieldCheck className="h-6 w-6" />,
    cls: "bg-emerald-500/10 text-emerald-500 ring-emerald-500/20",
    sub: "Signals look trustworthy. Proceed with normal caution.",
  },
  Caution: {
    icon: <ShieldAlert className="h-6 w-6" />,
    cls: "bg-amber-500/10 text-amber-500 ring-amber-500/20",
    sub: "Some signals are off. Verify details before sharing personal info.",
  },
  "Likely Scam": {
    icon: <ShieldX className="h-6 w-6" />,
    cls: "bg-rose-500/10 text-rose-500 ring-rose-500/20",
    sub: "Multiple red flags. Avoid sharing data or money.",
  },
};

export default function Legitimacy() {
  const { toast } = useToast();
  const [company, setCompany] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [report, setReport] = React.useState<LegitimacyReport | null>(null);

  const run = async () => {
    if (!company.trim()) {
      toast({ kind: "error", title: "Company required" });
      return;
    }
    setLoading(true);
    setReport(null);
    const r = await legitimacyApi.check({
      company,
      url: url || undefined,
      recruiter_email: email || undefined,
    });
    setReport(r);
    setLoading(false);
  };

  return (
    <div>
      <PageHeader
        title="Legitimacy check"
        description="Screen a company or recruiter for scam signals before you apply or share details."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Run a check</CardTitle>
            <CardDescription>Company is required; the rest helps</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Company</Label>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Lumina Health" />
            </div>
            <div>
              <Label>Company / posting URL</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://lumina.com/careers" />
            </div>
            <div>
              <Label>Recruiter email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="dana@lumina.com" />
            </div>
            <Button onClick={run} disabled={loading} className="w-full">
              {loading ? <Spinner /> : <Search className="h-4 w-4" />}
              {loading ? "Checking…" : "Check legitimacy"}
            </Button>
            <p className="text-xs text-muted-foreground">
              We check domain age, email domain match, careers-page presence,
              upfront-payment requests, social presence and salary realism.
            </p>
          </CardContent>
        </Card>

        <div className="lg:col-span-3">
          {!report && !loading && (
            <Card className="flex h-full min-h-[22rem] flex-col items-center justify-center p-8 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <p className="font-medium">Verdict and checklist appear here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Run a check to see a confidence score and which trust signals
                passed or failed.
              </p>
            </Card>
          )}

          {loading && (
            <Card className="flex h-full min-h-[22rem] items-center justify-center">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Spinner className="h-5 w-5" /> Screening signals…
              </span>
            </Card>
          )}

          {report && (
            <Card className="animate-scale-in">
              <CardContent className="p-6">
                <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
                  <ScoreRing score={report.score} size={104} stroke={9} label="legit" />
                  <div>
                    <div
                      className={cn(
                        "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 font-semibold ring-1",
                        VERDICT[report.verdict].cls,
                      )}
                    >
                      {VERDICT[report.verdict].icon}
                      {report.verdict}
                    </div>
                    <p className="mt-2 max-w-md text-sm text-muted-foreground">
                      {VERDICT[report.verdict].sub}
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-2.5">
                  {report.checks.map((c) => (
                    <div
                      key={c.label}
                      className="flex items-start gap-3 rounded-xl border border-border/60 p-3.5"
                    >
                      <div
                        className={cn(
                          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                          c.passed
                            ? "bg-emerald-500/15 text-emerald-500"
                            : "bg-rose-500/15 text-rose-500",
                        )}
                      >
                        {c.passed ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <X className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{c.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
