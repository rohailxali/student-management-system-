import {
  date,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: int("createdAt").notNull(),
  updatedAt: int("updatedAt").notNull(),
  lastSignedIn: int("lastSignedIn").notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Students table — core entity of the management system.
 * All business timestamps stored as UTC unix timestamps (seconds).
 */
export const students = mysqlTable(
  "students",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    studentId: varchar("studentId", { length: 40 }).notNull(),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 40 }),
    dateOfBirth: date("dateOfBirth"),
    grade: varchar("grade", { length: 40 }).notNull(),
    enrollmentDate: date("enrollmentDate").notNull(),
    status: mysqlEnum("status", ["active", "inactive", "graduated", "withdrawn"])
      .default("active")
      .notNull(),
    notes: text("notes"),
    createdAt: int("createdAt").notNull(),
    updatedAt: int("updatedAt").notNull(),
  },
  (table) => [uniqueIndex("student_id_idx").on(table.studentId)],
);

export type Student = typeof students.$inferSelect;
export type InsertStudent = typeof students.$inferInsert;

/**
 * Academic records — per-subject grades/marks attached to a student.
 */
export const academicRecords = mysqlTable("academic_records", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull(),
  subject: varchar("subject", { length: 120 }).notNull(),
  grade: varchar("grade", { length: 20 }),
  marks: int("marks"),
  maxMarks: int("maxMarks").default(100),
  term: varchar("term", { length: 40 }),
  recordedAt: date("recordedAt").notNull(),
  createdAt: int("createdAt").notNull(),
});

export type AcademicRecord = typeof academicRecords.$inferSelect;
export type InsertAcademicRecord = typeof academicRecords.$inferInsert;

/**
 * Activity log — administrative actions on students, powers the profile timeline.
 */
export const activityLog = mysqlTable("activity_log", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull(),
  action: mysqlEnum("action", [
    "created",
    "updated",
    "deleted",
    "record_added",
    "record_updated",
    "record_removed",
  ]).notNull(),
  detail: text("detail"),
  actor: varchar("actor", { length: 200 }),
  createdAt: int("createdAt").notNull(),
});

export type ActivityLogEntry = typeof activityLog.$inferSelect;
export type InsertActivityLogEntry = typeof activityLog.$inferInsert;
