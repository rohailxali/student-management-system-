import {
  and,
  asc,
  desc,
  eq,
  like,
  inArray,
  or,
  sql,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import {
  academicRecords,
  activityLog,
  InsertAcademicRecord,
  InsertActivityLogEntry,
  InsertStudent,
  InsertUser,
  students,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: any = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      if (!_pool) {
        _pool = mysql.createPool({
          uri: process.env.DATABASE_URL,
          ssl: {
            rejectUnauthorized: false
          },
          connectTimeout: 3000,
          waitForConnections: true,
          connectionLimit: 10,
          maxIdle: 10, 
          idleTimeout: 60000, 
          queueLimit: 0,
        });
      }
      _db = drizzle(_pool) as any;
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: Partial<InsertUser> & Pick<InsertUser, "openId">): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const now = Math.floor(Date.now() / 1000);
    const values: InsertUser = {
      openId: user.openId,
      createdAt: user.createdAt ?? now,
      updatedAt: user.updatedAt ?? now,
      lastSignedIn: user.lastSignedIn ?? now,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = Math.floor(new Date(user.lastSignedIn).getTime() / 1000);
      updateSet.lastSignedIn = values.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    updateSet.updatedAt = Math.floor(Date.now() / 1000);

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ---------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------

export type StudentListInput = {
  search?: string | null;
  grade?: string | null;
  status?: StudentStatus | null;
  sortBy?: SortField;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

/** Raw input shape from the API layer — dates as ISO strings, nullable optionals. */
export type RawStudentInput = {
  name: string;
  studentId: string;
  email?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  grade: string;
  enrollmentDate: string;
  status?: StudentStatus;
  notes?: string;
};

export type RawRecordInput = {
  studentId: number;
  subject: string;
  grade?: string | null;
  marks?: number | null;
  maxMarks?: number | null;
  term?: string | null;
  recordedAt: string;
};

export type StudentStatus = "active" | "inactive" | "graduated" | "withdrawn";
export type SortField = "name" | "studentId" | "enrollmentDate" | "grade" | "status" | "createdAt";

const sortMap = {
  name: students.name,
  studentId: students.studentId,
  enrollmentDate: students.enrollmentDate,
  grade: students.grade,
  status: students.status,
  createdAt: students.createdAt,
} as const;

const PAGE_SIZE = 12;

export async function listStudents(input: StudentListInput) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const {
    search,
    grade,
    status,
    sortBy = "createdAt",
    sortOrder = "desc",
    page = 1,
    pageSize = PAGE_SIZE,
  } = input;

  const conditions = [];
  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(
      or(
        like(students.name, term),
        like(students.studentId, term),
        like(students.email, term),
      ),
    );
  }
  if (grade) conditions.push(eq(students.grade, grade));
  if (status) conditions.push(eq(students.status, status));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const sortCol = sortMap[sortBy];
  const orderBy = sortOrder === "asc" ? asc(sortCol) : desc(sortCol);

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(students)
      .where(where)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset((Math.max(1, page) - 1) * pageSize),
    db
      .select({ count: sql<number>`count(*)` })
      .from(students)
      .where(where),
  ]);

  const total = Number(countResult[0]?.count ?? 0);
  return { rows, total, page: Math.max(1, page), pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getStudentById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.select().from(students).where(eq(students.id, id)).limit(1);
  return result[0];
}

export async function getStudentByStudentId(studentId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db
    .select()
    .from(students)
    .where(eq(students.studentId, studentId))
    .limit(1);
  return result[0];
}

export async function createStudent(data: RawStudentInput) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const now = Math.floor(Date.now() / 1000);
  const result = await db.insert(students).values({
    ...data,
    createdAt: now,
    updatedAt: now,
    enrollmentDate: toDate(data.enrollmentDate),
    dateOfBirth: data.dateOfBirth ? toDate(data.dateOfBirth) : null,
  } as InsertStudent);
  return { insertId: Number((result as unknown as [{ insertId: number }])[0]?.insertId) };
}

export async function updateStudent(id: number, data: Partial<RawStudentInput>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db
    .update(students)
    .set({
      ...data,
      updatedAt: Math.floor(Date.now() / 1000),
      enrollmentDate: data.enrollmentDate ? toDate(data.enrollmentDate) : undefined,
      dateOfBirth: data.dateOfBirth !== undefined ? (data.dateOfBirth ? toDate(data.dateOfBirth) : null) : undefined,
    })
    .where(eq(students.id, id));
}

export async function deleteStudent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(students).where(eq(students.id, id));
}

export async function resetData() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(academicRecords);
  await db.delete(activityLog);
  await db.delete(students);
}

export async function getDistinctGrades() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db
    .select({ grade: students.grade })
    .from(students)
    .groupBy(students.grade)
    .orderBy(asc(students.grade));
  return rows.map((r) => r.grade);
}

// ---------------------------------------------------------------------------
// Academic records
// ---------------------------------------------------------------------------

export async function listRecordsForStudent(studentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db
    .select()
    .from(academicRecords)
    .where(eq(academicRecords.studentId, studentId))
    .orderBy(desc(academicRecords.recordedAt), asc(academicRecords.subject));
}

export async function createRecord(data: RawRecordInput) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const now = Math.floor(Date.now() / 1000);
  await db.insert(academicRecords).values({
    ...data,
    createdAt: now,
    recordedAt: toDate(data.recordedAt),
  } as InsertAcademicRecord);
}

function toDate(value: string | Date | undefined | null): Date {
  if (!value) return new Date();
  return value instanceof Date ? value : new Date(`${value}T00:00:00Z`);
}

export async function deleteRecord(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(academicRecords).where(eq(academicRecords.id, id));
}

// ---------------------------------------------------------------------------
// Activity log
// ---------------------------------------------------------------------------

export async function logActivity(data: Partial<InsertActivityLogEntry> & Pick<InsertActivityLogEntry, "studentId" | "action">) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const now = Math.floor(Date.now() / 1000);
  await db.insert(activityLog).values({ ...data, createdAt: now } as InsertActivityLogEntry);
}

export async function listActivityForStudent(studentId: number, limit = 50) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db
    .select()
    .from(activityLog)
    .where(eq(activityLog.studentId, studentId))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);
}

// ---------------------------------------------------------------------------
// Dashboard stats
// ---------------------------------------------------------------------------

export async function getDashboardStats() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const nowSec = Math.floor(Date.now() / 1000);
  const day = 86400;

  // Current month window
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const monthStart = Math.floor(startOfMonth.getTime() / 1000);

  const [total, active, inactive, graduated, withdrawn, recentCount] = await Promise.all([
    countAll(students),
    countByStatus("active"),
    countByStatus("inactive"),
    countByStatus("graduated"),
    countByStatus("withdrawn"),
    countCreatedSince(monthStart),
  ]);

  // Enrollment trend: new enrollments per week for the last 8 weeks
  const weeks: { weekStart: number; weekEnd: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() - i * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    weeks.push({ weekStart: Math.floor(start.getTime() / 1000), weekEnd: Math.floor(end.getTime() / 1000) + day });
  }

  const trendRows = await Promise.all(
    weeks.map(async (w) => {
      const res = await db
        .select({ count: sql<number>`count(*)` })
        .from(students)
        .where(
          and(
            sql`DATE(${students.enrollmentDate}) >= FROM_UNIXTIME(${w.weekStart})`,
            sql`DATE(${students.enrollmentDate}) < FROM_UNIXTIME(${w.weekEnd})`,
          ),
        );
      return { weekStart: w.weekStart, count: Number(res[0]?.count ?? 0) };
    }),
  );

  // Grade distribution: count of students per grade (active only for overview)
  const gradeDistRows = await db
    .select({ grade: students.grade, count: sql<number>`count(*)` })
    .from(students)
    .where(eq(students.status, "active"))
    .groupBy(students.grade)
    .orderBy(sql`count(*)`);

  // Attendance/engagement overview: percentage of active students with recent activity
  const activeStudentsRes = await db.select({ id: students.id }).from(students).where(eq(students.status, "active"));
  const activeIds = activeStudentsRes.map((r) => r.id);
  let recentActivityStudentIds: Set<number> = new Set();
  if (activeIds.length > 0) {
    const dayWindow = nowSec - 14 * 86400;
    const acts = await db
      .select({ studentId: activityLog.studentId })
      .from(activityLog)
      .where(and(inArray(activityLog.studentId, activeIds), sql`${activityLog.createdAt} >= ${dayWindow}`));
    recentActivityStudentIds = new Set(acts.map((a) => a.studentId));
  }
  const engagementRate =
    activeIds.length > 0 ? Math.round((recentActivityStudentIds.size / activeIds.length) * 100) : 0;

  return {
    total,
    active,
    inactive,
    graduated,
    withdrawn,
    recentThisMonth: recentCount,
    enrollmentTrend: trendRows,
    gradeDistribution: gradeDistRows.map((r) => ({ grade: r.grade, count: Number(r.count) })),
    engagementRate,
    nowSec,
  };
}

async function countByStatus(status: StudentStatus) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const res = await db.select({ count: sql<number>`count(*)` }).from(students).where(eq(students.status, status));
  return Number(res[0]?.count ?? 0);
}

async function countAll(table: typeof students) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const res = await db.select({ count: sql<number>`count(*)` }).from(table);
  return Number(res[0]?.count ?? 0);
}

async function countCreatedSince(unixSec: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const res = await db
    .select({ count: sql<number>`count(*)` })
    .from(students)
    .where(sql`${students.createdAt} >= ${unixSec}`);
  return Number(res[0]?.count ?? 0);
}
