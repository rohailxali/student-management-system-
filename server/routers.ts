import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { TrpcContext } from "./_core/context";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  createRecord,
  createStudent,
  deleteRecord,
  deleteStudent,
  resetData,
  getDashboardStats,
  getDistinctGrades,
  getStudentById,
  getStudentByStudentId,
  listActivityForStudent,
  listRecordsForStudent,
  listStudents,
  logActivity,
  updateStudent,
} from "./db";
import {
  insertRecordSchema,
  insertStudentSchema,
  listStudentsSchema,
  updateStudentSchema,
} from "../shared/schema";

type AdminCtx = NonNullable<TrpcContext["user"]>;

const adminProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.user || ctx.user.role !== "admin") {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in required" });
  }
  return next({ ctx: { ...ctx, user: ctx.user as AdminCtx } });
});

// Alias so any authenticated user can perform student management
const staffProcedure = protectedProcedure;

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  students: router({
    list: publicProcedure.input(listStudentsSchema).query(({ input }) => listStudents(input)),

    get: publicProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input }) => {
        const student = await getStudentById(input.id);
        if (!student) throw new TRPCError({ code: "NOT_FOUND", message: "Student not found" });
        return student;
      }),

    create: staffProcedure.input(insertStudentSchema).mutation(async ({ input, ctx }) => {
      const existing = await getStudentByStudentId(input.studentId);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "A student with this ID already exists" });
      }
      const result = await createStudent(input);
      await logActivity({
        studentId: result.insertId,
        action: "created",
        detail: `Student "${input.name}" (${input.studentId}) added`,
        actor: ctx.user.name || ctx.user.email || "Admin",
      });
      return { id: result.insertId };
    }),

    update: staffProcedure
      .input(z.object({ id: z.number().int().positive(), data: updateStudentSchema }))
      .mutation(async ({ input, ctx }) => {
        const existing = await getStudentById(input.id);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Student not found" });
        if (input.data.studentId && input.data.studentId !== existing.studentId) {
          const conflict = await getStudentByStudentId(input.data.studentId);
          if (conflict && conflict.id !== input.id) {
            throw new TRPCError({ code: "CONFLICT", message: "A student with this ID already exists" });
          }
        }
        await updateStudent(input.id, input.data);
        await logActivity({
          studentId: input.id,
          action: "updated",
          detail: "Profile updated",
          actor: ctx.user.name || ctx.user.email || "Admin",
        });
        return { success: true } as const;
      }),

    delete: staffProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const existing = await getStudentById(input.id);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Student not found" });
        await logActivity({
          studentId: input.id,
          action: "deleted",
          detail: `Student "${existing.name}" (${existing.studentId}) removed`,
          actor: ctx.user.name || ctx.user.email || "Admin",
        });
        await deleteStudent(input.id);
        return { success: true } as const;
      }),

    grades: publicProcedure.query(() => getDistinctGrades()),

    reset: adminProcedure.mutation(async () => {
      await resetData();
      return { success: true } as const;
    }),
  }),

  records: router({
    list: publicProcedure
      .input(z.object({ studentId: z.number().int().positive() }))
      .query(({ input }) => listRecordsForStudent(input.studentId)),

    create: staffProcedure.input(insertRecordSchema).mutation(async ({ input, ctx }) => {
      const student = await getStudentById(input.studentId);
      if (!student) throw new TRPCError({ code: "NOT_FOUND", message: "Student not found" });
      await createRecord(input);
      await logActivity({
        studentId: input.studentId,
        action: "record_added",
        detail: `Academic record added: ${input.subject}${input.marks !== undefined ? ` (${input.marks}${input.maxMarks ? "/" + input.maxMarks : ""})` : ""}`,
        actor: ctx.user.name || ctx.user.email || "Admin",
      });
      return { success: true } as const;
    }),

    delete: staffProcedure
      .input(z.object({ id: z.number().int().positive(), studentId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await deleteRecord(input.id);
        await logActivity({
          studentId: input.studentId,
          action: "record_removed",
          detail: "Academic record removed",
          actor: ctx.user.name || ctx.user.email || "Admin",
        });
        return { success: true } as const;
      }),
  }),

  activity: router({
    list: publicProcedure
      .input(z.object({ studentId: z.number().int().positive() }))
      .query(({ input }) => listActivityForStudent(input.studentId)),
  }),

  dashboard: router({
    stats: publicProcedure.query(() => getDashboardStats()),
  }),
});

export type AppRouter = typeof appRouter;
