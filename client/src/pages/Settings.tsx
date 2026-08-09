import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Loader2, Moon, School, Sun, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { TRPCClientErrorLike } from "@trpc/client";
import type { AppRouter } from "@/../../server/routers";

const SCHOOL_NAME_KEY = "scholarly.schoolName";
const SCHOOL_NAME_DEFAULT = "Scholarly Academy";

export default function Settings() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const utils = trpc.useUtils();
  const meQuery = trpc.auth.me.useQuery();
  type ApiError = TRPCClientErrorLike<AppRouter>;
  const resetMutation = trpc.students.reset.useMutation({
    onSuccess: () => {
      utils.invalidate();
      toast.success("All student data cleared");
    },
    onError: (err: ApiError) => {
      toast.error(err.message || "Couldn't clear data");
    },
  });

  const [schoolName, setSchoolName] = useState(() =>
    localStorage.getItem(SCHOOL_NAME_KEY) ?? SCHOOL_NAME_DEFAULT,
  );
  const [savingName, setSavingName] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(SCHOOL_NAME_KEY, schoolName);
  }, [schoolName]);

  return (
    <div className="min-h-full">
      <PageHeader
        title="Settings"
        subtitle="Preferences and workspace management."
      />

      <div className="rise-in grid gap-4 max-w-3xl" style={{ animationDelay: "60ms" }}>
        {/* Identity */}
        <Card className="rounded-2xl bg-card card-soft">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <School className="h-4 w-4" /> School identity
            </CardTitle>
            <CardDescription className="font-light">
              The name shown across the workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-wrap items-end gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                const name = schoolName.trim();
                if (!name) {
                  toast.error("Name cannot be empty");
                  return;
                }
                setSavingName(true);
                setTimeout(() => {
                  setSavingName(false);
                  toast.success("School name updated");
                }, 250);
              }}
            >
              <div className="min-w-[240px] flex-1 space-y-1.5">
                <Label htmlFor="schoolName" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  School name
                </Label>
                <Input
                  id="schoolName"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  maxLength={80}
                  className="rounded-lg bg-background"
                />
              </div>
              <Button type="submit" size="sm" disabled={savingName} className="rounded-lg">
                {savingName ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                Save
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="rounded-2xl bg-card card-soft">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />} Appearance
            </CardTitle>
            <CardDescription className="font-light">
              Switch between the light canvas and the darker study room.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <Label htmlFor="dark-mode" className="text-sm font-normal">
              Dark mode
            </Label>
              <Switch
              id="dark-mode"
              checked={theme === "dark"}
              onCheckedChange={() => toggleTheme?.()}
            />
          </CardContent>
        </Card>

        {/* Account */}
        <Card className="rounded-2xl bg-card card-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Account</CardTitle>
            <CardDescription className="font-light">Signed in as</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-sm font-medium">{meQuery.data?.name || user?.name || "—"}</p>
            <p className="text-sm font-light text-muted-foreground">{meQuery.data?.email || user?.email || "—"}</p>
            <p className="text-xs font-light text-muted-foreground">
              Role: <span className="font-medium capitalize">{meQuery.data?.role || user?.role || "—"}</span>
            </p>
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card className="rounded-2xl border-destructive/30 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <Trash2 className="h-4 w-4" /> Danger zone
            </CardTitle>
            <CardDescription className="font-light">
              Irreversibly remove every student, record, and activity entry.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg text-destructive hover:bg-destructive/10"
              onClick={() => setResetOpen(true)}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" /> Clear all data
            </Button>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all data?</AlertDialogTitle>
            <AlertDialogDescription className="font-light">
              Every student, academic record, and activity entry will be permanently deleted.
              Your account and settings remain untouched.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resetMutation.mutate()}
              disabled={resetMutation.isPending}
              className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {resetMutation.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Clear everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
