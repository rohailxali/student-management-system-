import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, ChevronRight, XCircle, Box } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/* Animated counter — gentle number tick-up on first mount            */
/* ------------------------------------------------------------------ */
export function AnimatedNumber({
  value,
  duration = 700,
  className,
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }
    fromRef.current = display;
    startRef.current = null;
    let raf: number;
    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const t = Math.min(1, (ts - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(fromRef.current + (value - fromRef.current) * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return <span className={className}>{display.toLocaleString()}</span>;
}

/* ------------------------------------------------------------------ */
/* Status badge                                                       */
/* ------------------------------------------------------------------ */
const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  inactive: "bg-muted text-muted-foreground",
  graduated: "bg-[oklch(0.75_0.1_255)]/20 text-[oklch(0.45_0.1_255)] dark:text-[oklch(0.75_0.08_255)]",
  withdrawn: "bg-[oklch(0.8_0.08_20)]/30 text-[oklch(0.45_0.09_20)] dark:text-[oklch(0.8_0.06_20)]",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        STATUS_STYLES[status] ?? STATUS_STYLES.inactive,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
      {status}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Empty + loading skeletons                                          */
/* ------------------------------------------------------------------ */
export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-4 fade-in" aria-busy="true" aria-label="Loading">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-10 w-64 rounded-lg" />
      <Skeleton className="h-10 rounded-xl" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 rounded-xl" />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Box,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center p-8">
      <div className="flex shrink-0 items-center justify-center p-4 rounded-full bg-secondary/50 mb-2">
        <Icon className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      <p className="max-w-sm text-sm font-light text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page header                                                        */
/* ------------------------------------------------------------------ */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="rise-in mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm font-light text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stat card                                                          */
/* ------------------------------------------------------------------ */
export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  delay = 0,
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: "neutral" | "blue" | "pink" | "green" | "amber";
  delay?: number;
}) {
  const toneBg: Record<string, string> = {
    neutral: "bg-secondary/60",
    blue: "bg-[oklch(0.8_0.07_255)]/35",
    pink: "bg-[oklch(0.88_0.05_20)]/50",
    green: "bg-emerald-500/10",
    amber: "bg-amber-500/10",
  };
  return (
    <div
      className="rise-in rounded-2xl bg-card p-5 card-soft"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight" aria-live="polite">
        {typeof value === "number" ? <AnimatedNumber value={value} /> : value}
      </p>
      {hint && (
        <p className={`mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${toneBg[tone]}`}>
          {hint}
        </p>
      )}
    </div>
  );
}
