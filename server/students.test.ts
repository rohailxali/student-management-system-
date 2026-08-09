import { describe, expect, it } from "vitest";
import { insertStudentSchema, listStudentsSchema } from "../shared/schema";

describe("insertStudentSchema", () => {
  it("validates a correct student payload", () => {
    const payload = {
      name: "Jane Doe",
      studentId: "STU-1234",
      email: "jane@example.com",
      phone: "+1 555 123 4567",
      dateOfBirth: "2005-10-15",
      grade: "Grade 10",
      enrollmentDate: "2023-08-25",
      status: "active",
      notes: "Excellent student",
    };
    const result = insertStudentSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("fails on invalid email", () => {
    const payload = {
      name: "Jane Doe",
      studentId: "STU-1234",
      email: "not-an-email",
      grade: "Grade 10",
      enrollmentDate: "2023-08-25",
      status: "active",
    };
    const result = insertStudentSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Invalid email address");
    }
  });

  it("fails on missing required fields", () => {
    const payload = {
      email: "jane@example.com",
    };
    const result = insertStudentSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
});

describe("listStudentsSchema", () => {
  it("uses defaults for omitted values", () => {
    const result = listStudentsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(12);
      expect(result.data.sortBy).toBe("createdAt");
      expect(result.data.sortOrder).toBe("desc");
    }
  });

  it("allows overriding pagination and sort", () => {
    const payload = {
      page: 3,
      pageSize: 20,
      sortBy: "name",
      sortOrder: "asc",
    };
    const result = listStudentsSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.pageSize).toBe(20);
      expect(result.data.sortBy).toBe("name");
      expect(result.data.sortOrder).toBe("asc");
    }
  });
});
