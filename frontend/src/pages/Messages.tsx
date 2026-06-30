import * as React from "react";
import type { MessageTone, MessageType } from "@/types";
import { messagesApi } from "@/lib/api";
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
import { cn } from "@/lib/utils";
import {
  MessageSquare,
  Copy,
  Check,
  Linkedin,
  UserRound,
  Mail,
  FileSignature,
  Clock,
  HeartHandshake,
} from "lucide-react";

const TYPES: {
  value: MessageType;
  label: string;
  icon: React.ReactNode;
  desc: string;
}[] = [
  { value: "linkedin_note", label: "LinkedIn note", icon: <Linkedin className="h-4 w-4" />, desc: "Connection request (300 char)" },
  { value: "recruiter_message", label: "Recruiter message", icon: <UserRound className="h-4 w-4" />, desc: "DM to a recruiter" },
  { value: "hr_email", label: "HR email", icon: <Mail className="h-4 w-4" />, desc: "Formal follow-up email" },
  { value: "cover_letter", label: "Cover letter", icon: <FileSignature className="h-4 w-4" />, desc: "Full cover letter" },
  { value: "follow_up", label: "Follow-up", icon: <Clock className="h-4 w-4" />, desc: "Nudge after applying" },
  { value: "thank_you", label: "Thank-you", icon: <HeartHandshake className="h-4 w-4" />, desc: "Post-interview note" },
];

const TONES: { value: MessageTone; label: string }[] = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "concise", label: "Concise" },
];

export default function Messages() {
  const { activeResume } = useStore();
  const { toast } = useToast();
  const [type, setType] = React.useState<MessageType>("recruiter_message");
  const [tone, setTone] = React.useState<MessageTone>("professional");
  const [title, setTitle] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [recruiter, setRecruiter] = React.useState("");
  const [desc, setDesc] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [content, setContent] = React.useState("");
  const [copied, setCopied] = React.useState(false);

  const generate = async () => {
    if (!activeResume) return;
    if (!title || !company) {
      toast({ kind: "error", title: "Add job info", description: "Title and company are required." });
      return;
    }
    setLoading(true);
    setContent("");
    const r = await messagesApi.generate({
      type,
      resume_id: activeResume.id,
      job: { title, company, description: desc || undefined },
      recruiter_name: recruiter || undefined,
      tone,
    });
    setContent(r.content);
    setLoading(false);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast({ kind: "success", title: "Copied to clipboard" });
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div>
      <PageHeader
        title="Messages"
        description="Generate outreach and application messages tuned to your resume and the role."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Compose</CardTitle>
            <CardDescription>Choose a type, fill in the role</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Message type</Label>
              <div className="grid grid-cols-2 gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setType(t.value)}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all",
                      type === t.value
                        ? "border-primary/50 bg-primary/5"
                        : "border-border hover:bg-secondary/40",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-lg",
                        type === t.value
                          ? "bg-primary/15 text-primary"
                          : "bg-secondary text-muted-foreground",
                      )}
                    >
                      {t.icon}
                    </span>
                    <span className="text-sm font-medium">{t.label}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {t.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Job title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="React Developer" />
              </div>
              <div>
                <Label>Company</Label>
                <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Cobalt Studio" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Recruiter name</Label>
                <Input value={recruiter} onChange={(e) => setRecruiter(e.target.value)} placeholder="Optional" />
              </div>
              <div>
                <Label>Tone</Label>
                <Select
                  value={tone}
                  onChange={(e) => setTone(e.target.value as MessageTone)}
                  options={TONES}
                />
              </div>
            </div>
            <div>
              <Label>Job description (optional)</Label>
              <Textarea rows={4} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Helps personalize the message…" />
            </div>
            <Button onClick={generate} disabled={loading} className="w-full">
              {loading ? <Spinner /> : <MessageSquare className="h-4 w-4" />}
              {loading ? "Generating…" : "Generate message"}
            </Button>
          </CardContent>
        </Card>

        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>{TYPES.find((t) => t.value === type)?.label}</CardTitle>
                <CardDescription>Editable — tweak before sending</CardDescription>
              </div>
              {content && (
                <Button size="sm" variant="outline" onClick={copy}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex h-72 items-center justify-center text-muted-foreground">
                  <Spinner className="mr-2 h-5 w-5" /> Drafting…
                </div>
              ) : content ? (
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[20rem] font-mono text-sm leading-relaxed"
                />
              ) : (
                <div className="flex h-72 flex-col items-center justify-center text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <MessageSquare className="h-7 w-7" />
                  </div>
                  <p className="font-medium">Your message will appear here</p>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    Fill in the role and click generate to get a polished, ready
                    to copy draft.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
