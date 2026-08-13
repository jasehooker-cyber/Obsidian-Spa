import { describe, it, expect } from "vitest";
import { IntakeSubmissionSchema } from "@/lib/schemas/booking";

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

  it("rejects a non-uuid token", () => {
    const result = IntakeSubmissionSchema.safeParse({ ...valid, token: "abc" });
    expect(result.success).toBe(false);
  });
});
