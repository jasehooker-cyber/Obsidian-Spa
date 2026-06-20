import { describe, it, expect } from "vitest";
import {
  BookingDraftSchema,
  CreateSetupSessionSchema,
  IntakeSubmissionSchema,
} from "@/lib/schemas/booking";

describe("BookingDraftSchema", () => {
  const valid = {
    serviceId: "signature-60",
    addOnIds: ["cbd", "hot-stones"],
    therapistId: "550e8400-e29b-41d4-a716-446655440000",
    slotStart: "2026-06-25T14:00:00Z",
    slotEnd: "2026-06-25T15:00:00Z",
  };

  it("accepts valid input", () => {
    expect(BookingDraftSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts empty addOnIds", () => {
    const result = BookingDraftSchema.safeParse({ ...valid, addOnIds: [] });
    expect(result.success).toBe(true);
  });

  it("rejects invalid serviceId", () => {
    const result = BookingDraftSchema.safeParse({
      ...valid,
      serviceId: "not-a-service",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid addOnId", () => {
    const result = BookingDraftSchema.safeParse({
      ...valid,
      addOnIds: ["not-an-addon"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-uuid therapistId", () => {
    const result = BookingDraftSchema.safeParse({
      ...valid,
      therapistId: "abc",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing slotStart", () => {
    const { slotStart: _, ...rest } = valid;
    const result = BookingDraftSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});

describe("CreateSetupSessionSchema", () => {
  const valid = {
    draftId: "550e8400-e29b-41d4-a716-446655440000",
    clientName: "John Smith",
    clientEmail: "john@example.com",
    clientPhone: "5551234567",
  };

  it("accepts valid input", () => {
    expect(CreateSetupSessionSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = CreateSetupSessionSchema.safeParse({
      ...valid,
      clientEmail: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = CreateSetupSessionSchema.safeParse({
      ...valid,
      clientName: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short phone", () => {
    const result = CreateSetupSessionSchema.safeParse({
      ...valid,
      clientPhone: "123",
    });
    expect(result.success).toBe(false);
  });
});

describe("IntakeSubmissionSchema", () => {
  const valid = {
    token: "550e8400-e29b-41d4-a716-446655440000",
    pressurePreference: "firm" as const,
  };

  it("accepts valid input with only required fields", () => {
    expect(IntakeSubmissionSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts valid input with all optional fields", () => {
    const result = IntakeSubmissionSchema.safeParse({
      ...valid,
      healthConditions: "Lower back pain",
      allergies: "Nut oils",
      focusAreas: "Shoulders",
      avoidAreas: "Feet",
      additionalNotes: "First visit",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid pressure preference", () => {
    const result = IntakeSubmissionSchema.safeParse({
      ...valid,
      pressurePreference: "extreme",
    });
    expect(result.success).toBe(false);
  });
});
