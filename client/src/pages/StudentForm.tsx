import { EmptyState, PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { insertStudentSchema } from "@shared/schema";
import { Loader2, Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation, useRoute } from "wouter";

type FormState = {
  name: string;
  studentId: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  grade: string;
  enrollmentDate: string;
  status: string;
  notes: string;
};

const emptyForm: FormState = {
  name: "",
  studentId: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  grade: "",
  enrollmentDate: "",
  status: "active",
  notes: "",
};

function dateToStr(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

function fieldError(form: FormState, field: keyof FormState): string | null {
  // Validate a single field in isolation where possible; cross-field checks happen on submit.
  try {
    const shape: Record<string, unknown> = {};
    for (const key of Object.keys(emptyForm) as (keyof FormState)[]) {
      shape[key] = form[key] === "" ? undefined : form[key];
    }
    const parsed = insertStudentSchema.safeParse(shape);
    if (parsed.success) return null;
    const issue = parsed.error.issues.find((i) => i.path[0] === field);
    return issue ? issue.message : null;
  } catch {
    return null;
  }
}

export default function StudentForm() {
  const [, params] = useRoute("/students/:id");
  const [, editParams] = useRoute("/students/:id/edit");
  const id = (params ?? editParams)?.id;
  const isEdit = !!id;

  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const existingQuery = trpc.students.get.useQuery(
    { id: Number(id) },
    { enabled: isEdit, retry: false },
  );

  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitted, setSubmitted] = useState(false);
  const [dirtyFields, setDirtyFields] = useState<Set<keyof FormState>>(new Set());

  const createMutation = trpc.students.create.useMutation({
    onSuccess: (result) => {
      utils.students.list.invalidate();
      utils.dashboard.stats.invalidate();
      toast.success("Student added");
      setLocation(`/students/${result.id}`);
    },
    onError: (err) => {
      toast.error(err.message || "Couldn't add student");
    },
  });

  const updateMutation = trpc.students.update.useMutation({
    onMutate: async (variables) => {
      await utils.students.get.cancel({ id: Number(id) });
      const prev = utils.students.get.getData({ id: Number(id) });
      utils.students.get.setData({ id: Number(id) }, (old) =>
        old ? ({ ...old, ...variables.data } as typeof old) : old,
      );
      return { prev };
    },
    onSuccess: () => {
      utils.students.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.students.grades.invalidate();
      toast.success("Changes saved");
      setLocation(`/students/${id}`);
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev && id) {
        utils.students.get.setData({ id: Number(id) }, ctx.prev);
      }
      toast.error(err.message || "Couldn't save changes");
    },
  });

  if (isEdit && existingQuery.isLoading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading student">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 w-full animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    );
  }

  if (isEdit && existingQuery.error) {
    return (
      <EmptyState
        title="Student not found"
        description="This record doesn't exist or could not be loaded."
        action={
          <Button asChild variant="outline" size="sm">
            <a href="/students">Back to directory</a>
          </Button>
        }
      />
    );
  }

  useEffect(() => {
    if (isEdit && existingQuery.data) {
      const d = existingQuery.data;
      setForm((f) =>
        f.name || f.studentId || f.grade
          ? f
          : {
              name: d.name,
              studentId: d.studentId,
              email: d.email ?? "",
              phone: d.phone ?? "",
              dateOfBirth: dateToStr(d.dateOfBirth),
              grade: d.grade,
              enrollmentDate: dateToStr(d.enrollmentDate),
              status: d.status,
              notes: d.notes ?? "",
            },
      );
    }
  }, [isEdit, existingQuery.data]);

  function update(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    if (submitted) {
      setDirtyFields((s) => new Set(s).add(field));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);

    const shape: Record<string, unknown> = {};
    for (const key of Object.keys(emptyForm) as (keyof FormState)[]) {
      shape[key] = form[key] === "" ? undefined : form[key];
    }
    const parsed = insertStudentSchema.safeParse(shape);
    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path[0] as keyof FormState | undefined;
      if (field) setDirtyFields((s) => new Set(s).add(field));
      toast.error(parsed.error.issues[0]?.message || "Please check the form");
      return;
    }

    const payload = {
      name: parsed.data.name,
      studentId: parsed.data.studentId,
      email: parsed.data.email ?? "",
      phone: parsed.data.phone ?? "",
      dateOfBirth: parsed.data.dateOfBirth,
      grade: parsed.data.grade,
      enrollmentDate: parsed.data.enrollmentDate,
      status: parsed.data.status,
      notes: parsed.data.notes ?? "",
    };

    if (isEdit) {
      updateMutation.mutate({ id: Number(id), data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const busy = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="min-h-full">
      <PageHeader
        title={isEdit ? "Edit student" : "Add student"}
        subtitle={isEdit ? "Update the record below." : "Record a new student in the directory."}
      />

      <Card className="rise-in mx-auto max-w-2xl rounded-2xl bg-card card-soft" style={{ animationDelay: "60ms" }}>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              {/* 1. Name */}
              <Field
                label="Name"
                htmlFor="name"
                error={submitted || dirtyFields.has("name") ? fieldError(form, "name") : null}
              >
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Full name"
                  aria-invalid={!!(submitted && fieldError(form, "name"))}
                  className="rounded-lg bg-background"
                />
              </Field>

              {/* 2. Student ID */}
              <Field
                label="Student ID"
                htmlFor="studentId"
                error={
                  submitted || dirtyFields.has("studentId")
                    ? fieldError(form, "studentId")
                    : null
                }
              >
                <Input
                  id="studentId"
                  value={form.studentId}
                  onChange={(e) => update("studentId", e.target.value)}
                  placeholder="e.g. STU-2026-014"
                  aria-invalid={!!(submitted && fieldError(form, "studentId"))}
                  className="rounded-lg bg-background"
                />
              </Field>

              {/* 3. Email */}
              <Field
                label="Email"
                htmlFor="email"
                error={submitted || dirtyFields.has("email") ? fieldError(form, "email") : null}
              >
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="student@example.com"
                  aria-invalid={!!(submitted && fieldError(form, "email"))}
                  className="rounded-lg bg-background"
                />
              </Field>

              {/* 4. Phone */}
              <Field
                label="Phone"
                htmlFor="phone"
                error={submitted || dirtyFields.has("phone") ? fieldError(form, "phone") : null}
              >
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="+1 555 123 4567"
                  aria-invalid={!!(submitted && fieldError(form, "phone"))}
                  className="rounded-lg bg-background"
                />
              </Field>

              {/* 5. Date of birth */}
              <Field
                label="Date of birth"
                htmlFor="dateOfBirth"
                error={
                  submitted || dirtyFields.has("dateOfBirth")
                    ? fieldError(form, "dateOfBirth")
                    : null
                }
              >
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => update("dateOfBirth", e.target.value)}
                  aria-invalid={!!(submitted && fieldError(form, "dateOfBirth"))}
                  className="rounded-lg bg-background"
                />
              </Field>

              {/* 6. Grade / class */}
              <Field
                label="Grade / class"
                htmlFor="grade"
                error={submitted || dirtyFields.has("grade") ? fieldError(form, "grade") : null}
              >
                <Input
                  id="grade"
                  value={form.grade}
                  onChange={(e) => update("grade", e.target.value)}
                  placeholder="e.g. Grade 10"
                  list="grade-suggestions"
                  aria-invalid={!!(submitted && fieldError(form, "grade"))}
                  className="rounded-lg bg-background"
                />
                <datalist id="grade-suggestions">
                  {[
                    "Grade 7",
                    "Grade 8",
                    "Grade 9",
                    "Grade 10",
                    "Grade 11",
                    "Grade 12",
                    "Freshman",
                    "Sophomore",
                    "Junior",
                    "Senior",
                  ].map((g) => (
                    <option key={g} value={g} />
                  ))}
                </datalist>
              </Field>

              {/* 7. Enrollment date */}
              <Field
                label="Enrollment date"
                htmlFor="enrollmentDate"
                error={
                  submitted || dirtyFields.has("enrollmentDate")
                    ? fieldError(form, "enrollmentDate")
                    : null
                }
              >
                <Input
                  id="enrollmentDate"
                  type="date"
                  value={form.enrollmentDate}
                  onChange={(e) => update("enrollmentDate", e.target.value)}
                  aria-invalid={!!(submitted && fieldError(form, "enrollmentDate"))}
                  className="rounded-lg bg-background"
                />
              </Field>

              {/* 8. Status */}
              <Field label="Status" htmlFor="status">
                <Select value={form.status} onValueChange={(v) => update("status", v)}>
                  <SelectTrigger id="status" className="rounded-lg bg-background" aria-label="Status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="graduated">Graduated</SelectItem>
                    <SelectItem value="withdrawn">Withdrawn</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              {/* 9. Notes */}
              <div className="sm:col-span-2">
                <Field
                  label="Notes"
                  htmlFor="notes"
                  error={submitted || dirtyFields.has("notes") ? fieldError(form, "notes") : null}
                >
                  <textarea
                    id="notes"
                    value={form.notes}
                    onChange={(e) => update("notes", e.target.value)}
                    placeholder="Additional information about the student..."
                    rows={4}
                    aria-invalid={!!(submitted && fieldError(form, "notes"))}
                    className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </Field>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation(isEdit ? `/students/${id}` : "/students")}
                className="rounded-lg"
              >
                <X className="mr-1 h-4 w-4" /> Cancel
              </Button>
              <Button type="submit" disabled={busy} className="rounded-lg">
                {busy ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-1 h-4 w-4" />
                )}
                {isEdit ? "Save changes" : "Add student"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
      {error && <p className="text-xs font-light text-destructive">{error}</p>}
    </div>
  );
}
