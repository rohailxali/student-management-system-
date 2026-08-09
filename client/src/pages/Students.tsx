import { EmptyState, PageHeader, PageSkeleton, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, ArrowUpDown, Plus, Search, X } from "lucide-react";
import { useQueryState } from "@/hooks/useQueryState";
import { Link } from "wouter";
import { format } from "date-fns";
import type { SortField } from "@shared/schema";
import type { StudentStatus } from "@shared/schema";

type SortOrder = "asc" | "desc";

export default function Students() {
  const [search, setSearch] = useQueryState<string>("q", "");
  const [grade, setGrade] = useQueryState<string>("grade", "");
  const [status, setStatus] = useQueryState<string>("status", "");
  const [sortBy, setSortBy] = useQueryState<string>("sort", "createdAt");
  const [sortOrder, setSortOrder] = useQueryState<SortOrder>("order", "desc");
  const [page, setPage] = useQueryState<number>("page", 1);

  const queryInput = {
    search: search || null,
    grade: grade || null,
    status: (status || null) as StudentStatus | null,
    sortBy: sortBy as SortField,
    sortOrder,
    page,
    pageSize: 12,
  };

  const listQuery = trpc.students.list.useQuery(queryInput);
  const gradesQuery = trpc.students.grades.useQuery();

  const total = listQuery.data?.total ?? 0;
  const totalPages = listQuery.data?.totalPages ?? 1;

  function toggleSort(field: string) {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  }

  const filtersActive = !!(search || grade || status);

  function getPageNumbers() {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, 4, -1, totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(1, -1, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, -1, page - 1, page, page + 1, -1, totalPages);
      }
    }
    return pages;
  }

  return (
    <div className="min-h-full">
      <PageHeader
        title="Students"
        subtitle={`${total.toLocaleString()} student${total === 1 ? "" : "s"} in the directory`}
        actions={
          <Button asChild className="rounded-lg">
            <Link href="/students/new">
              <Plus className="mr-1 h-4 w-4" /> Add student
            </Link>
          </Button>
        }
      />

      {/* Search + filters */}
      <div className="rise-in mb-4 flex flex-wrap items-center gap-2" style={{ animationDelay: "60ms" }}>
        <div className="relative min-w-[220px] flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, ID or email…"
            aria-label="Search students"
            className="rounded-lg bg-card pl-9 pr-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-secondary"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Select
          value={grade || "all"}
          onValueChange={(v) => {
            setGrade(v === "all" ? "" : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[150px] rounded-lg bg-card" aria-label="Filter by grade">
            <SelectValue placeholder="All grades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All grades</SelectItem>
            {(gradesQuery.data ?? []).map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={status || "all"}
          onValueChange={(v) => {
            setStatus(v === "all" ? "" : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px] rounded-lg bg-card" aria-label="Filter by status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="graduated">Graduated</SelectItem>
            <SelectItem value="withdrawn">Withdrawn</SelectItem>
          </SelectContent>
        </Select>

        {filtersActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setGrade("");
              setStatus("");
              setPage(1);
            }}
            className="rounded-lg text-xs font-light"
          >
            <X className="mr-1 h-3.5 w-3.5" /> Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      {listQuery.isLoading ? (
        <PageSkeleton rows={6} />
      ) : !listQuery.data?.rows.length ? (
        <EmptyState
          title={filtersActive ? "No matching students" : "No students yet"}
          description={
            filtersActive
              ? "Try adjusting your search or filters to find what you're looking for."
              : "Start by adding your first student to the directory."
          }
          action={
            !filtersActive ? (
              <Button asChild size="sm" className="rounded-lg">
                <Link href="/students/new">
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add student
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="rise-in overflow-hidden rounded-2xl bg-card card-soft" style={{ animationDelay: "100ms" }}>
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                  <SortableHead field="name" current={sortBy} order={sortOrder} onSort={toggleSort}>
                    Name
                  </SortableHead>
                  <SortableHead field="studentId" current={sortBy} order={sortOrder} onSort={toggleSort}>
                    Student ID
                  </SortableHead>
                  <SortableHead field="grade" current={sortBy} order={sortOrder} onSort={toggleSort}>
                    Grade
                  </SortableHead>
                  <SortableHead field="enrollmentDate" current={sortBy} order={sortOrder} onSort={toggleSort}>
                    Enrolled
                  </SortableHead>
                  <SortableHead field="status" current={sortBy} order={sortOrder} onSort={toggleSort}>
                    Status
                  </SortableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQuery.data.rows.map((student, i) => (
                  <TableRow
                    key={student.id}
                    className="rise-in cursor-pointer transition-colors hover:bg-secondary/60"
                    style={{ animationDelay: `${i * 30}ms` }}
                    onClick={() => (window.location.href = `/students/${student.id}`)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                            i % 2 === 0
                              ? "bg-[oklch(0.85_0.06_255)]/50 text-[oklch(0.4_0.09_255)]"
                              : "bg-[oklch(0.88_0.05_20)]/60 text-[oklch(0.42_0.09_20)]",
                          )}
                          aria-hidden="true"
                        >
                          {student.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate">{student.name}</p>
                          {student.email && (
                            <p className="truncate text-xs font-light text-muted-foreground">{student.email}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-light text-muted-foreground">{student.studentId}</TableCell>
                    <TableCell>{student.grade}</TableCell>
                    <TableCell className="font-light text-muted-foreground">
                      {student.enrollmentDate
                        ? format(new Date(String(student.enrollmentDate)), "MMM d, yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={student.status} />
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-lg" aria-label={`View ${student.name}`}>
                        <Link href={`/students/${student.id}`} onClick={(e) => e.stopPropagation()}>
                          →
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="rise-in mt-4 flex justify-center" style={{ animationDelay: "140ms" }}>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setPage(Math.max(1, page - 1))}
                      className={cn("cursor-pointer", page <= 1 && "pointer-events-none opacity-40")}
                      aria-label="Previous page"
                    />
                  </PaginationItem>
                  {getPageNumbers().map((p, i) => (
                    <PaginationItem key={i}>
                      {p === -1 ? (
                        <PaginationEllipsis />
                      ) : (
                        <PaginationLink
                          isActive={page === p}
                          onClick={() => setPage(p)}
                          className="cursor-pointer"
                          aria-label={`Go to page ${p}`}
                        >
                          {p}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      className={cn("cursor-pointer", page >= totalPages && "pointer-events-none opacity-40")}
                      aria-label="Next page"
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SortableHead({
  field,
  current,
  order,
  onSort,
  children,
}: {
  field: SortField;
  current: string;
  order: SortOrder;
  onSort: (field: SortField) => void;
  children: React.ReactNode;
}) {
  const active = current === field;
  return (
    <TableHead>
      <button
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider hover:text-primary"
        aria-label={`Sort by ${children}`}
      >
        {children}
        {active ? (
          order === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5 text-primary" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 text-primary" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
        )}
      </button>
    </TableHead>
  );
}

/* Loading row placeholder for graceful loading state inside table */
export function StudentTableSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading students">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-xl" />
      ))}
    </div>
  );
}
