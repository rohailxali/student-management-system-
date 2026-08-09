import { EmptyState, PageSkeleton, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { ACTIVITY_LABELS } from "@/lib/activity";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Clock,
  Edit3,
  Landmark,
  Loader2,
  Mail,
  Phone,
  Plus,
  Trash2,
  User,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link, useLocation, useRoute } from "wouter";

function unixToDate(unix: number | string) {
  return new Date(Number(unix) * 1000);
}

function dateToStr(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? "" : value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

export default function StudentDetail() {
  const [, params] = useRoute("/students/:id");
  const id = Number(params?.id);
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const studentQuery = trpc.students.get.useQuery({ id }, { enabled: Number.isFinite(id), retry: false });
  const recordsQuery = trpc.records.list.useQuery({ studentId: id }, { enabled: Number.isFinite(id) });
  const activityQuery = trpc.activity.list.useQuery({ studentId: id }, { enabled: Number.isFinite(id) });

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [recordForm, setRecordForm] = useState({
    subject: "",
    grade: "",
    marks: "",
    maxMarks: "100",
    term: "",
    recordedAt: new Date().toISOString().slice(0, 10),
  });

  const deleteMutation = trpc.students.delete.useMutation({
    onSuccess: () => {
      utils.students.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.students.grades.invalidate();
      toast.success("Student deleted");
      setLocation("/students");
    },
    onError: (err) => toast.error(err.message || "Couldn't delete student"),
  });

  const addRecordMutation = trpc.records.create.useMutation({
    onSuccess: () => {
      utils.records.list.invalidate({ studentId: id });
      utils.activity.list.invalidate({ studentId: id });
      setRecordForm((f) => ({ ...f, subject: "", grade: "", marks: "", term: "" }));
      toast.success("Academic record added");
    },
    onError: (err) => toast.error(err.message || "Couldn't add record"),
  });

  const removeRecordMutation = trpc.records.delete.useMutation({
    onMutate: async (variables) => {
      await utils.records.list.cancel({ studentId: id });
      const prev = utils.records.list.getData({ studentId: id });
      utils.records.list.setData({ studentId: id }, (old) =>
        old ? old.filter((r) => r.id !== variables.id) : old,
      );
      return { prev };
    },
    onSuccess: () => {
      utils.records.list.invalidate({ studentId: id });
      utils.activity.list.invalidate({ studentId: id });
      toast.success("Record removed");
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.records.list.setData({ studentId: id }, ctx.prev);
      toast.error("Couldn't remove record");
    },
  });

  if (!Number.isFinite(id) || studentQuery.isLoading) {
    return <PageSkeleton rows={5} />;
  }

  if (studentQuery.error) {
    return (
      <EmptyState
        title="Student not found"
        description="This record doesn't exist or could not be loaded."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/students">Back to directory</Link>
          </Button>
        }
      />
    );
  }

  const s = studentQuery.data;
  if (!s) {
    return (
      <EmptyState
        title="Student not found"
        description="This record doesn't exist or could not be loaded."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/students">Back to directory</Link>
          </Button>
        }
      />
    );
  }
  const initials = s.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const avg = (() => {
    const withMarks = (recordsQuery.data ?? []).filter((r) => r.marks != null && r.maxMarks != null);
    if (!withMarks.length) return null;
    const pct =
      withMarks.reduce((acc, r) => acc + (Number(r.marks) / Number(r.maxMarks)) * 100, 0) /
      withMarks.length;
    return Math.round(pct);
  })();

  return (
    <div className="min-h-full">
      {/* Back bar */}
      <div className="rise-in mb-6 flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/students")}
          className="rounded-lg"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Students
        </Button>
      </div>

      {/* Profile header */}
      <div className="rise-in relative mb-6 overflow-hidden rounded-2xl bg-card card-soft" style={{ animationDelay: "40ms" }}>
        <span className="geo-shape -right-10 -top-10 h-40 w-40 bg-[oklch(0.85_0.06_255)]/50" aria-hidden="true" />
        <span className="geo-shape bottom-4 right-24 h-10 w-10 bg-[oklch(0.85_0.07_20)]/60" aria-hidden="true" />
        <div className="relative flex flex-wrap items-center gap-5 p-6 sm:p-8">
          <span
            className={cn(
              "flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-lg font-bold",
              "bg-[oklch(0.85_0.06_255)]/50 text-[oklch(0.4_0.09_255)]",
            )}
            aria-hidden="true"
          >
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{s.name}</h1>
              <StatusBadge status={s.status} />
            </div>
            <p className="mt-1 text-sm font-light text-muted-foreground">
              {s.studentId} · {s.grade}
              {avg !== null && (
                <span className="ml-2 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  Average {avg}%
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="rounded-lg">
              <Link href={`/students/${s.id}/edit`}>
                <Edit3 className="mr-1 h-3.5 w-3.5" /> Edit
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg text-destructive hover:bg-destructive/10"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        {/* Info card */}
        <Card className="rise-in xl:col-span-2 rounded-2xl bg-card card-soft" style={{ animationDelay: "80ms" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Profile information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow icon={Mail} label="Email" value={s.email || "—"} />
            <InfoRow icon={Phone} label="Phone" value={s.phone || "—"} />
            <InfoRow
              icon={CalendarDays}
              label="Date of birth"
              value={s.dateOfBirth ? format(new Date(String(s.dateOfBirth)), "MMMM d, yyyy") : "—"}
            />
            <InfoRow
              icon={Landmark}
              label="Grade / class"
              value={s.grade}
            />
            <InfoRow
              icon={CalendarDays}
              label="Enrollment date"
              value={
                s.enrollmentDate
                  ? format(new Date(String(s.enrollmentDate)), "MMMM d, yyyy")
                  : "—"
              }
            />
            <InfoRow
              icon={Clock}
              label="Record created"
              value={format(unixToDate(s.createdAt), "MMMM d, yyyy")}
            />
            {s.notes && (
              <div className="pt-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Notes</p>
                <p className="text-sm font-light text-muted-foreground whitespace-pre-wrap">{s.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Academic records */}
        <Card className="rise-in xl:col-span-3 rounded-2xl bg-card card-soft" style={{ animationDelay: "120ms" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4" /> Academic records
            </CardTitle>
            <span className="text-xs font-light text-muted-foreground">
              {(recordsQuery.data ?? []).length} record{(recordsQuery.data ?? []).length === 1 ? "" : "s"}
            </span>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Add new record</h4>
              <form
                className="grid gap-3 rounded-xl bg-secondary/50 p-4 sm:grid-cols-6"
              onSubmit={(e) => {
                e.preventDefault();
                const subject = recordForm.subject.trim();
                if (!subject) {
                  toast.error("Subject is required");
                  return;
                }
                addRecordMutation.mutate({
                  studentId: id,
                  subject,
                  grade: recordForm.grade || null,
                  marks: recordForm.marks === "" ? null : Number(recordForm.marks),
                  maxMarks: Number(recordForm.maxMarks) || 100,
                  term: recordForm.term || null,
                  recordedAt: recordForm.recordedAt,
                });
              }}
            >
              <div className="sm:col-span-2">
                <Label htmlFor="subject" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Subject</Label>
                <Input
                  id="subject"
                  value={recordForm.subject}
                  onChange={(e) => setRecordForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder="e.g. Mathematics"
                  className="mt-1 rounded-lg bg-card"
                />
              </div>
              <div className="sm:col-span-1">
                <Label htmlFor="term" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Term</Label>
                <Input
                  id="term"
                  value={recordForm.term}
                  onChange={(e) => setRecordForm((f) => ({ ...f, term: e.target.value }))}
                  placeholder="Fall 2026"
                  className="mt-1 rounded-lg bg-card"
                />
              </div>
              <div>
                <Label htmlFor="gradeRecord" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Grade</Label>
                <Input
                  id="gradeRecord"
                  value={recordForm.grade}
                  onChange={(e) => setRecordForm((f) => ({ ...f, grade: e.target.value }))}
                  placeholder="A"
                  className="mt-1 rounded-lg bg-card"
                />
              </div>
              <div>
                <Label htmlFor="marks" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Marks</Label>
                <Input
                  id="marks"
                  type="number"
                  value={recordForm.marks}
                  onChange={(e) => setRecordForm((f) => ({ ...f, marks: e.target.value }))}
                  placeholder="88"
                  className="mt-1 rounded-lg bg-card"
                />
              </div>
              <div>
                <Label htmlFor="recordedAt" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Date</Label>
                <Input
                  id="recordedAt"
                  type="date"
                  value={recordForm.recordedAt}
                  onChange={(e) => setRecordForm((f) => ({ ...f, recordedAt: e.target.value }))}
                  className="mt-1 rounded-lg bg-card"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="submit"
                  size="sm"
                  disabled={addRecordMutation.isPending}
                  className="w-full rounded-lg"
                >
                  {addRecordMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>
              </form>
            </div>

            {recordsQuery.isLoading ? (
              <div className="space-y-2" aria-busy="true">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : !recordsQuery.data?.length ? (
              <EmptyState
                title="No academic records yet"
                description="Log a grade, test score, or term result above to begin tracking academic history."
              />
            ) : (
              <ul className="divide-y divide-border/60">
                {recordsQuery.data.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{r.subject}</p>
                      <p className="text-xs font-light text-muted-foreground">
                        {r.term ? `${r.term} · ` : ""}
                        {format(new Date(String(r.recordedAt)), "MMM d, yyyy")}
                        {r.marks != null && r.maxMarks != null
                          ? ` · ${Number(r.marks)}/${Number(r.maxMarks)}`
                          : ""}
                        {r.grade ? ` · ${r.grade}` : ""}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:text-destructive"
                      aria-label={`Delete record for ${r.subject}`}
                      disabled={removeRecordMutation.isPending}
                      onClick={() => removeRecordMutation.mutate({ id: r.id, studentId: id })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity timeline */}
      <Card className="rise-in mt-4 rounded-2xl bg-card card-soft" style={{ animationDelay: "160ms" }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Activity timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {activityQuery.isLoading ? (
            <div className="space-y-2" aria-busy="true">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-xl" />
              ))}
            </div>
          ) : !activityQuery.data?.length ? (
            <EmptyState
              title="No activity yet"
              description="Actions on this student will appear here as a timeline."
            />
          ) : (
            <ol className="relative space-y-1 border-l border-border pl-6 ml-2">
              {activityQuery.data.map((a, i) => (
                <li key={a.id} className="rise-in relative pb-5" style={{ animationDelay: `${i * 40}ms` }}>
                  <span
                    className={cn(
                      "absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full",
                      i === 0 ? "bg-primary/20 ring-2 ring-primary/40" : "bg-muted",
                    )}
                    aria-hidden="true"
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", i === 0 ? "bg-primary" : "bg-muted-foreground/50")} />
                  </span>
                  <p className="text-sm">
                    <span className="font-semibold">{ACTIVITY_LABELS[a.action]}</span>{" "}
                    <span className="font-light text-muted-foreground">{a.detail}</span>
                  </p>
                  <p className="text-xs font-light text-muted-foreground">
                    {formatDistanceToNow(unixToDate(a.createdAt), { addSuffix: true })}
                    {a.actor ? ` · by ${a.actor}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this student?</AlertDialogTitle>
            <AlertDialogDescription className="font-light">
              This will permanently remove {s.name}'s profile, academic records, and activity
              history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate({ id: s.id })}
              disabled={deleteMutation.isPending}
              className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-1 h-4 w-4" />
              )}
              Delete student
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="truncate text-sm">{value}</p>
      </div>
    </div>
  );
}
