import * as React from "react";
import { resumeApi } from "@/lib/api";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import { PageHeader, Spinner, Chip, EmptyState } from "@/components/common";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate, initials } from "@/lib/utils";
import {
  UploadCloud,
  FileText,
  Trash2,
  GraduationCap,
  Briefcase,
  FolderGit2,
  Target,
  KeyRound,
  Mail,
  Phone,
  Github,
  Linkedin,
  Globe,
  CheckCircle2,
} from "lucide-react";

export default function Resume() {
  const { resumes, activeResume, activeResumeId, setActiveResumeId, addResume, refreshResumes } =
    useStore();
  const { toast } = useToast();
  const [dragging, setDragging] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      toast({ kind: "error", title: "PDF only", description: "Please upload a PDF resume." });
      return;
    }
    setUploading(true);
    const profile = await resumeApi.upload(file);
    addResume(profile);
    setUploading(false);
    toast({
      kind: "success",
      title: "Resume parsed",
      description: `${profile.skills.length} skills · ${profile.best_fit_roles.length} best-fit roles extracted.`,
    });
  };

  const handleDelete = async (id: number) => {
    await resumeApi.remove(id);
    await refreshResumes();
    toast({ kind: "info", title: "Resume removed" });
  };

  return (
    <div>
      <PageHeader
        title="Resume"
        description="Upload a PDF and we'll extract a structured profile and best-fit roles."
      />

      {/* Upload dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed py-12 text-center transition-all",
          dragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-secondary/30",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {uploading ? <Spinner className="h-6 w-6" /> : <UploadCloud className="h-7 w-7" />}
        </div>
        <p className="font-medium">
          {uploading ? "Parsing your resume…" : "Drag & drop your resume PDF"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          or click to browse · PDF up to 10MB
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Versions list */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Resume versions</CardTitle>
            <CardDescription>{resumes.length} uploaded</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {resumes.length === 0 && (
              <EmptyState icon={<FileText className="h-5 w-5" />} title="No resumes yet" />
            )}
            {resumes.map((r) => (
              <button
                key={r.id}
                onClick={() => setActiveResumeId(r.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all",
                  r.id === activeResumeId
                    ? "border-primary/40 bg-primary/5"
                    : "border-border hover:bg-secondary/40",
                )}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.filename}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(r.created_at)} · {r.skills.length} skills
                  </p>
                </div>
                {r.id === activeResumeId && (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                )}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleDelete(r.id);
                  }}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-500"
                  aria-label="Delete resume"
                >
                  <Trash2 className="h-4 w-4" />
                </span>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Extracted profile */}
        {activeResume && (
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xl font-bold text-white">
                  {initials(activeResume.candidate_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold">
                    {activeResume.candidate_name}
                  </h2>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    {activeResume.email && (
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" />
                        {activeResume.email}
                      </span>
                    )}
                    {activeResume.phone && (
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" />
                        {activeResume.phone}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {activeResume.links.linkedin && (
                      <LinkChip icon={<Linkedin className="h-3.5 w-3.5" />} href={activeResume.links.linkedin} />
                    )}
                    {activeResume.links.github && (
                      <LinkChip icon={<Github className="h-3.5 w-3.5" />} href={activeResume.links.github} />
                    )}
                    {activeResume.links.portfolio && (
                      <LinkChip icon={<Globe className="h-3.5 w-3.5" />} href={activeResume.links.portfolio} />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Section icon={<Target className="h-4 w-4 text-primary" />} title="Best-fit roles">
                <div className="flex flex-wrap gap-2">
                  {activeResume.best_fit_roles.map((role) => (
                    <Badge key={role} variant="success">
                      {role}
                    </Badge>
                  ))}
                </div>
              </Section>

              <Section icon={<KeyRound className="h-4 w-4 text-amber-500" />} title="Missing keywords">
                <div className="flex flex-wrap gap-2">
                  {activeResume.missing_keywords.map((k) => (
                    <Badge key={k} variant="warning">
                      {k}
                    </Badge>
                  ))}
                </div>
              </Section>
            </div>

            <Section title="Skills">
              <div className="flex flex-wrap gap-2">
                {activeResume.skills.map((s) => (
                  <Chip key={s}>{s}</Chip>
                ))}
              </div>
            </Section>

            <Section icon={<FolderGit2 className="h-4 w-4 text-violet-400" />} title="Projects">
              <div className="space-y-3">
                {activeResume.projects.map((p) => (
                  <div key={p.name} className="rounded-xl border border-border/60 p-4">
                    <p className="font-medium">{p.name}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {p.description}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {p.tech.map((t) => (
                        <Chip key={t}>{t}</Chip>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Section icon={<Briefcase className="h-4 w-4 text-primary" />} title="Experience">
                <div className="space-y-4">
                  {activeResume.experience.map((e, i) => (
                    <div key={i}>
                      <p className="text-sm font-medium">{e.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.company} · {e.duration}
                      </p>
                      <ul className="mt-1.5 space-y-1">
                        {e.highlights.map((h, j) => (
                          <li key={j} className="flex gap-2 text-sm text-muted-foreground">
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                            {h}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </Section>

              <Section icon={<GraduationCap className="h-4 w-4 text-emerald-500" />} title="Education">
                <div className="space-y-3">
                  {activeResume.education.map((ed, i) => (
                    <div key={i}>
                      <p className="text-sm font-medium">{ed.school}</p>
                      <p className="text-xs text-muted-foreground">
                        {ed.degree} · {ed.year}
                      </p>
                    </div>
                  ))}
                </div>
              </Section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function LinkChip({ icon, href }: { icon: React.ReactNode; href: string }) {
  const url = href.startsWith("http") ? href : `https://${href}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1 text-xs text-secondary-foreground transition-colors hover:bg-secondary/70"
    >
      {icon}
      {href.replace(/^https?:\/\//, "")}
    </a>
  );
}
