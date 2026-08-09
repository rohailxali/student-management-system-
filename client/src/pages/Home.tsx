import {
  AnimatedNumber,
  EmptyState,
  PageHeader,
  PageSkeleton,
  StatCard,
  StatusBadge,
} from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMemo } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { ArrowRight, Plus, TrendingUp } from "lucide-react";

function weekLabel(weekStart: number) {
  return format(new Date(weekStart * 1000), "MMM d");
}

function monthLabel(unix: number) {
  return format(new Date(unix * 1000), "MMM d, yyyy");
}

export default function Home() {
  const statsQuery = trpc.dashboard.stats.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const recentQuery = trpc.students.list.useQuery({
    sortBy: "createdAt",
    sortOrder: "desc",
    page: 1,
    pageSize: 5,
  });

  const trendData = useMemo(
    () => (statsQuery.data?.enrollmentTrend ?? []).map((w) => ({
      name: weekLabel(w.weekStart),
      enrolled: w.count,
    })),
    [statsQuery.data],
  );

  const gradeData = useMemo(
    () =>
      (statsQuery.data?.gradeDistribution ?? [])
        .map((g) => ({ name: g.grade, students: g.count }))
        .sort((a, b) => b.students - a.students)
        .slice(0, 8),
    [statsQuery.data],
  );

  const s = statsQuery.data;
  const totalActive = s ? s.active + s.graduated : 0;
  const attendancePct = s?.engagementRate ?? 0;

  if (statsQuery.isLoading || recentQuery.isLoading) {
    return <PageSkeleton />;
  }

  if (statsQuery.error) {
    return (
      <EmptyState
        title="Couldn't load dashboard"
        description="Something went wrong while fetching your data. Please try again."
      />
    );
  }

  return (
    <div className="relative min-h-full">
      <span className="geo-shape -top-32 right-0 h-64 w-64 bg-[oklch(0.88_0.05_255)]/50" aria-hidden="true" />
      <PageHeader
        title="Dashboard"
        subtitle="A quiet overview of your student body."
        actions={
          <Button asChild className="rounded-lg">
            <Link href="/students/new">
              <Plus className="mr-1 h-4 w-4" /> Add student
            </Link>
          </Button>
        }
      />

      <section className="rise-in grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Summary statistics">
        <StatCard label="Total students" value={s?.total ?? 0} tone="blue" hint="All records" delay={0} />
        <StatCard
          label="Active"
          value={s?.active ?? 0}
          tone="green"
          hint={`${s?.recentThisMonth ?? 0} joined this month`}
          delay={60}
        />
        <StatCard
          label="Inactive"
          value={(s?.inactive ?? 0) + (s?.withdrawn ?? 0)}
          tone="amber"
          hint={`${s?.inactive ?? 0} inactive · ${s?.withdrawn ?? 0} withdrawn`}
          delay={120}
        />
        <StatCard label="Graduated" value={s?.graduated ?? 0} tone="pink" hint="Completed" delay={180} />
      </section>

      <div className="mt-8 grid gap-4 xl:grid-cols-5">
        {/* Enrollment trend */}
        <Card className="rise-in xl:col-span-3 rounded-2xl bg-card card-soft" style={{ animationDelay: "220ms" }}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              Enrollment trend
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {trendData.every(d => d.enrolled === 0) ? (
              <EmptyState
                title="No enrollments yet"
                description="New enrollment data will appear here as students join."
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="enrollFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.7 0.1 255)" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="oklch(0.7 0.1 255)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.008 240)" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "oklch(0.53 0.015 255)" }} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "oklch(0.53 0.015 255)" }} />
                  <Tooltip
                    cursor={{ stroke: "oklch(0.55 0.13 255)", strokeDasharray: "4 4" }}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid oklch(0.895 0.008 240)",
                      boxShadow: "0 8px 24px -12px oklch(0.22 0.01 260 / 0.15)",
                      fontSize: 13,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="enrolled"
                    stroke="oklch(0.55 0.13 255)"
                    strokeWidth={2}
                    fill="url(#enrollFill)"
                    name="New enrollments"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Grade distribution */}
        <Card className="rise-in xl:col-span-2 rounded-2xl bg-card card-soft" style={{ animationDelay: "280ms" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Grade distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {gradeData.length === 0 ? (
              <EmptyState
                title="No students yet"
                description="Add your first students to see a breakdown by grade."
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gradeData} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.008 240)" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "oklch(0.53 0.015 255)" }} />
                  <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={80} tick={{ fontSize: 12, fill: "oklch(0.53 0.015 255)" }} />
                  <Tooltip
                    cursor={{ fill: "oklch(0.93 0.02 255 / 0.5)" }}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid oklch(0.895 0.008 240)",
                      boxShadow: "0 8px 24px -12px oklch(0.22 0.01 260 / 0.15)",
                      fontSize: 13,
                    }}
                  />
                  <Bar dataKey="students" fill="oklch(0.85 0.08 20)" radius={[0, 6, 6, 0]} name="Students" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Attendance / engagement + recent additions */}
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="rise-in rounded-2xl bg-card card-soft" style={{ animationDelay: "340ms" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Attendance overview</CardTitle>
          </CardHeader>
          <CardContent>
            {totalActive === 0 ? (
              <EmptyState
                title="No active students"
                description="Engagement tracking begins once students are enrolled."
              />
            ) : (
              <div className="flex flex-col gap-5 py-2">
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-bold tracking-tight" aria-live="polite">
                    <AnimatedNumber value={attendancePct} />%
                  </span>
                  <span className="text-sm font-light text-muted-foreground">
                    of active students with recent activity
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-700"
                    style={{ width: `${attendancePct}%` }}
                  />
                </div>
                <p className="text-xs font-light text-muted-foreground">
                  Measured from activity recorded over the past 14 days across{" "}
                  <span className="font-medium">{totalActive} active students</span>.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rise-in xl:col-span-2 rounded-2xl bg-card card-soft" style={{ animationDelay: "400ms" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Recent additions</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link href="/students">
                View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {!recentQuery.data?.rows.length ? (
              <EmptyState
                title="No students yet"
                description="Your newest enrollments will appear here."
                action={
                  <Button asChild size="sm" className="rounded-lg">
                    <Link href="/students/new">
                      <Plus className="mr-1 h-3.5 w-3.5" /> Add your first student
                    </Link>
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-border/60">
                {recentQuery.data.rows.map((student, i) => (
                  <li key={student.id}>
                    <Link
                      href={`/students/${student.id}`}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-secondary/60",
                      )}
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                            i % 2 === 0
                              ? "bg-[oklch(0.85_0.06_255)]/50 text-[oklch(0.4_0.09_255)]"
                              : "bg-[oklch(0.88_0.05_20)]/60 text-[oklch(0.42_0.09_20)]",
                          )}
                          aria-hidden="true"
                        >
                          {student.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{student.name}</p>
                          <p className="truncate text-xs font-light text-muted-foreground">
                            {student.studentId} · {student.grade}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <StatusBadge status={student.status} />
                        <Badge variant="outline" className="font-light text-muted-foreground">
                          {monthLabel(student.createdAt)}
                        </Badge>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
