import * as React from "react";
import type { TailorResult } from "@/types";
import { tailorApi } from "@/lib/api";
import { useStore } from "@/lib/store";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Wand2,
  Copy,
  Check,
  AlertTriangle,
  KeyRound,
  FileText,
  ListOrdered,
} from "lucide-react";

export default function Tailor() {
  const { resumes, activeResumeId } = useStore();
  const { toast } = useToast();
  const [resumeId, setResumeId] = React.useState<number | null>(activeResumeId);
  const [jobTitle, setJobTitle] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [jd, setJd] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<TailorResult | null>(null);
  const [tab, setTab] = React.useState("ats");
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => setResumeId(activeResumeId), [activeResumeId]);

  const run = async () => {
    if (!resumeId || !jd.trim()) {
      toast({ kind: "error", title: "Add a resume and JD", description: "Both are required to tailor." });
      return;
    }
    setLoading(true);
    setResult(null);
    const r = await tailorApi.run({
      resume_id: resumeId,
      job_description: jd,
      job_title: jobTitle || undefined,
      company: company || undefined,
    });
    setResult(r);
    setLoading(false);
  };

  const copyAts = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.ats_resume_markdown);
    setCopied(true);
    toast({ kind: "success", title: "ATS resume copied" });
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div>
      <PageHeader
        title="Tailor"
        description="Rewrite your resume for a specific job — keywords, summary, ordering and an ATS-ready version."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Inputs</CardTitle>
            <CardDescription>Pick a resume and paste the JD</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Resume</Label>
              <Select
                value={resumeId ?? ""}
                onChange={(e) => setResumeId(Number(e.target.value))}
                options={resumes.map((r) => ({
                  value: String(r.id),
                  label: r.filename,
                }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Job title</Label>
                <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="React Developer" />
              </div>
              <div>
                <Label>Company</Label>
                <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Cobalt Studio" />
              </div>
            </div>
            <div>
              <Label>Job description</Label>
              <Textarea
                rows={10}
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder="Paste the full job description…"
              />
            </div>
            <Button onClick={run} disabled={loading} className="w-full">
              {loading ? <Spinner /> : <Wand2 className="h-4 w-4" />}
              {loading ? "Tailoring…" : "Tailor my resume"}
            </Button>
          </CardContent>
        </Card>

        <div className="lg:col-span-3">
          {!result && !loading && (
            <Card className="flex h-full min-h-[24rem] flex-col items-center justify-center p-8 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Wand2 className="h-7 w-7" />
              </div>
              <p className="font-medium">Tailored output appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Keywords to add, a rewritten summary, smart project ordering, and
                a copy-paste ATS resume.
              </p>
            </Card>
          )}

          {loading && (
            <Card className="flex h-full min-h-[24rem] items-center justify-center">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Spinner className="h-5 w-5" /> Rewriting for this role…
              </span>
            </Card>
          )}

          {result && (
            <Card className="animate-scale-in">
              <CardContent className="p-6">
                <Tabs value={tab} onValueChange={setTab}>
                  <TabsList className="mb-5">
                    <TabsTrigger value="ats">ATS resume</TabsTrigger>
                    <TabsTrigger value="summary">Summary</TabsTrigger>
                    <TabsTrigger value="keywords">Keywords</TabsTrigger>
                    <TabsTrigger value="projects">Projects</TabsTrigger>
                  </TabsList>

                  <TabsContent value="ats">
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="flex items-center gap-2 text-sm font-semibold">
                        <FileText className="h-4 w-4 text-primary" /> ATS-friendly resume
                      </h4>
                      <Button size="sm" variant="outline" onClick={copyAts}>
                        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? "Copied" : "Copy"}
                      </Button>
                    </div>
                    <pre className="max-h-[26rem] overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-secondary/40 p-4 font-mono text-xs leading-relaxed scrollbar-thin">
                      {result.ats_resume_markdown}
                    </pre>
                  </TabsContent>

                  <TabsContent value="summary">
                    <h4 className="mb-2 text-sm font-semibold">Rewritten summary</h4>
                    <p className="rounded-xl border border-border bg-secondary/30 p-4 text-sm leading-relaxed">
                      {result.rewritten_summary}
                    </p>
                  </TabsContent>

                  <TabsContent value="keywords">
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                      <KeyRound className="h-4 w-4 text-amber-500" /> Suggested keywords
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {result.suggested_keywords.map((k) => (
                        <Badge key={k} variant="default">
                          {k}
                        </Badge>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="projects">
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                      <ListOrdered className="h-4 w-4 text-violet-400" /> Reordered projects
                    </h4>
                    <div className="space-y-2.5">
                      {result.reordered_projects.map((p, i) => (
                        <div key={p.name} className="flex gap-3 rounded-xl border border-border/60 p-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {i + 1}
                          </span>
                          <div>
                            <p className="text-sm font-medium">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>

                {result.warnings.length > 0 && (
                  <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                    <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-500">
                      <AlertTriangle className="h-4 w-4" /> Honesty warnings
                    </p>
                    <ul className="space-y-1.5">
                      {result.warnings.map((w, i) => (
                        <li key={i} className="text-sm text-muted-foreground">
                          • {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
