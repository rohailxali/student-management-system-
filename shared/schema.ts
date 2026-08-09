import { z } from "zod";

export type SortField = "name" | "studentId" | "enrollmentDate" | "grade" | "status" | "createdAt";

export const STUDENT_STATUSES = ["active", "inactive", "graduated", "withdrawn"] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];

export const SORT_FIELDS = ["name", "studentId", "enrollmentDate", "grade", "status", "createdAt"] as const;
export const GRADES = [
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
] as const;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[+\d][\d\s\-().]{6,20}$/;
const studentIdRegex = /^[A-Za-z0-9][A-Za-z0-9\-_. ]{2,38}$/;

export const insertStudentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(200, "Name is too long"),
  studentId: z
    .string()
    .trim()
    .min(3, "Student ID must be at least 3 characters")
    .max(40, "Student ID is too long")
    .regex(studentIdRegex, "Student ID may only contain letters, numbers, hyphens, dots, and spaces"),
  email: z
    .string()
    .trim()
    .max(320, "Email is too long")
    .refine((v) => v === "" || emailRegex.test(v), "Invalid email address"),
  phone: z
    .string()
    .trim()
    .max(40, "Phone is too long")
    .refine((v) => v === "" || phoneRegex.test(v), "Invalid phone number"),
  dateOfBirth: z
    .string()
    .date()
    .refine((v) => new Date(v) <= new Date(), "Date of birth cannot be in the future")
    .nullable()
    .optional(),
  grade: z.string().trim().min(1, "Grade is required").max(40, "Grade is too long"),
  enrollmentDate: z.string().date("Enrollment date is required"),
  status: z.enum(STUDENT_STATUSES).default("active"),
  notes: z.string().trim().max(2000, "Notes are too long").optional(),
});

export const updateStudentSchema = insertStudentSchema.partial();

export const listStudentsSchema = z.object({
  search: z.string().max(100).optional().nullable(),
  grade: z.string().max(40).optional().nullable(),
  status: z.enum(STUDENT_STATUSES).optional().nullable(),
  sortBy: z.enum(SORT_FIELDS).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  page: z.number().int().min(1).max(1000).default(1),
  pageSize: z.number().int().min(1).max(100).default(12),
});

export const insertRecordSchema = z.object({
  studentId: z.number().int().positive(),
  subject: z.string().trim().min(1, "Subject is required").max(120, "Subject is too long"),
  grade: z.string().trim().max(20).optional().nullable(),
  marks: z.number().int().min(0).max(10000).optional().nullable(),
  maxMarks: z.number().int().min(1).max(10000).default(100),
  term: z.string().trim().max(40).optional().nullable(),
  recordedAt: z.string().date(),
});
