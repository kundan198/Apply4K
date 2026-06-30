import * as React from "react";
import type { Application, AppStatus } from "@/types";
import { applicationsApi } from "@/lib/api";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import { PageHeader, Spinner, EmptyState } from "@/components/common";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Dialog, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { STATUSES, StatusBadge } from "@/components/StatusBadge";
import { cn, scoreColor, formatDate } from "@/lib/utils";
import {
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  ListChecks,
  Inbox,
} from "lucide-react";

const STATUS_OPTS = STATUSES.map((s) => ({ value: s, label: s }));

const EMPTY: Partial<Application> = {
  company: "",
  job_title: "",
  location: "",
  job_link: "",
  fit_score: null,
  resume_version: "",
  date_applied: "",
  status: "Saved",
  notes: "",
  follow_up_date: "",
};

export default function Tracker() {
  const { resumes } = useStore();
  const { toast } = useToast();
  const [apps, setApps] = React.useState<Application[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<AppStatus | "All">("All");
  const [editing, setEditing] = React.useState<Partial<Application> | null>(
    null,
  );
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(() => {
    setLoading(true);
    applicationsApi.list().then((a) => {
      setApps(a);
      setLoading(false);
    });
  }, []);

  React.useEffect(() => load(), [load]);

  const filtered =
    filter === "All" ? apps : apps.filter((a) => a.status === filter);

  const save = async () => {
    if (!editing) return;
    if (!editing.company || !editing.job_title) {
      toast({ kind: "error", title: "Company & title required" });
      return;
    }
    setSaving(true);
    try {
      const payload: Partial<Application> = {
        ...editing,
        location: editing.location || null,
        job_link: editing.job_link || null,
        resume_version: editing.resume_version || null,
        date_applied: editing.date_applied || null,
        notes: editing.notes || null,
        follow_up_date: editing.follow_up_date || null,
      };
      if (editing.id) {
        const updated = await applicationsApi.update(editing.id, payload);
        setApps((prev) => prev.map((a) => (a.id === editing.id ? updated : a)));
        toast({ kind: "success", title: "Application updated" });
      } else {
        const created = await applicationsApi.create(payload);
        setApps((prev) => [created, ...prev]);
        toast({ kind: "success", title: "Application added" });
      }
      setEditing(null);
    } catch (error) {
      toast({
        kind: "error",
        title: "Could not save application",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    await applicationsApi.remove(id);
    setApps((prev) => prev.filter((a) => a.id !== id));
    toast({ kind: "info", title: "Application deleted" });
  };

  const quickStatus = async (a: Application, status: AppStatus) => {
    setApps((prev) =>
      prev.map((x) => (x.id === a.id ? { ...x, status } : x)),
    );
    try {
      await applicationsApi.update(a.id, { status });
    } catch (error) {
      setApps((prev) =>
        prev.map((x) => (x.id === a.id ? { ...x, status: a.status } : x)),
      );
      toast({
        kind: "error",
        title: "Status not updated",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const counts = STATUSES.reduce(
    (acc, s) => {
      acc[s] = apps.filter((a) => a.status === s).length;
      return acc;
    },
    {} as Record<AppStatus, number>,
  );

  return (
    <div>
      <PageHeader
        title="Tracker"
        description="Every application in one place — status, fit score, notes and follow-ups."
        action={
          <Button onClick={() => setEditing({ ...EMPTY })}>
            <Plus className="h-4 w-4" /> Add application
          </Button>
        }
      />

      {/* Filter pills */}
      <div className="mb-5 flex flex-wrap gap-2">
        <FilterPill active={filter === "All"} onClick={() => setFilter("All")}>
          All <span className="text-muted-foreground">{apps.length}</span>
        </FilterPill>
        {STATUSES.map((s) => (
          <FilterPill key={s} active={filter === s} onClick={() => setFilter(s)}>
            {s} <span className="text-muted-foreground">{counts[s]}</span>
          </FilterPill>
        ))}
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-muted-foreground">
            <Spinner className="mr-2 h-5 w-5" /> Loading applications…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<Inbox className="h-5 w-5" />}
              title="No applications here"
              description="Add one with the button above, or change the filter."
            />
          </div>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Company</TH>
                <TH>Title</TH>
                <TH>Location</TH>
                <TH>Fit</TH>
                <TH>Resume</TH>
                <TH>Applied</TH>
                <TH>Status</TH>
                <TH>Follow-up</TH>
                <TH className="text-right">Actions</TH>
              </tr>
            </THead>
            <TBody>
              {filtered.map((a) => (
                <TR key={a.id}>
                  <TD className="font-medium">{a.company}</TD>
                  <TD className="max-w-[12rem] truncate">{a.job_title}</TD>
                  <TD className="text-muted-foreground">{a.location ?? "—"}</TD>
                  <TD>
                    <span className={cn("font-semibold tabular-nums", scoreColor(a.fit_score))}>
                      {a.fit_score ?? "—"}
                    </span>
                  </TD>
                  <TD className="max-w-[10rem] truncate text-xs text-muted-foreground">
                    {a.resume_version ?? "—"}
                  </TD>
                  <TD className="text-muted-foreground">
                    {formatDate(a.date_applied)}
                  </TD>
                  <TD>
                    <Select
                      value={a.status}
                      onChange={(e) =>
                        quickStatus(a, e.target.value as AppStatus)
                      }
                      options={STATUS_OPTS}
                      className="h-8 w-36 text-xs"
                    />
                  </TD>
                  <TD className="text-muted-foreground">
                    {formatDate(a.follow_up_date)}
                  </TD>
                  <TD>
                    <div className="flex items-center justify-end gap-1">
                      {a.job_link && (
                        <a
                          href={a.job_link}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                          aria-label="Open link"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      <button
                        onClick={() => setEditing(a)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                        aria-label="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => remove(a.id)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      {/* Add / edit dialog */}
      <Dialog open={!!editing} onClose={() => setEditing(null)} className="max-w-2xl">
        {editing && (
          <>
            <DialogTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary" />
              {editing.id ? "Edit application" : "Add application"}
            </DialogTitle>
            <DialogDescription>
              Track status, fit score and follow-ups.
            </DialogDescription>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Company">
                <Input value={editing.company ?? ""} onChange={(e) => setEditing({ ...editing, company: e.target.value })} />
              </Field>
              <Field label="Job title">
                <Input value={editing.job_title ?? ""} onChange={(e) => setEditing({ ...editing, job_title: e.target.value })} />
              </Field>
              <Field label="Location">
                <Input value={editing.location ?? ""} onChange={(e) => setEditing({ ...editing, location: e.target.value })} />
              </Field>
              <Field label="Job link">
                <Input value={editing.job_link ?? ""} onChange={(e) => setEditing({ ...editing, job_link: e.target.value })} />
              </Field>
              <Field label="Fit score">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={editing.fit_score ?? ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      fit_score: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </Field>
              <Field label="Resume version">
                <Select
                  value={editing.resume_version ?? ""}
                  onChange={(e) => setEditing({ ...editing, resume_version: e.target.value })}
                >
                  <option value="">—</option>
                  {resumes.map((r) => (
                    <option key={r.id} value={r.filename}>
                      {r.filename}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Date applied">
                <Input type="date" value={editing.date_applied ?? ""} onChange={(e) => setEditing({ ...editing, date_applied: e.target.value })} />
              </Field>
              <Field label="Follow-up date">
                <Input type="date" value={editing.follow_up_date ?? ""} onChange={(e) => setEditing({ ...editing, follow_up_date: e.target.value })} />
              </Field>
              <Field label="Status">
                <Select
                  value={editing.status ?? "Saved"}
                  onChange={(e) => setEditing({ ...editing, status: e.target.value as AppStatus })}
                  options={STATUS_OPTS}
                />
              </Field>
              <div className="flex items-end pb-0.5">
                {editing.status && <StatusBadge status={editing.status as AppStatus} />}
              </div>
              <div className="col-span-2">
                <Field label="Notes">
                  <Textarea
                    rows={3}
                    value={editing.notes ?? ""}
                    onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  />
                </Field>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving && <Spinner />}
                {editing.id ? "Save changes" : "Add"}
              </Button>
            </div>
          </>
        )}
      </Dialog>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all",
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:bg-secondary/50",
      )}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
