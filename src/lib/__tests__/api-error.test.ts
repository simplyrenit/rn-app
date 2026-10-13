import { describe, expect, it } from "@jest/globals";
import { apiError, fieldErrors, hasApiCode } from "../api-error";

/** What axios throws for an HTTP failure; `isAxiosError` is the only marker it checks. */
const failed = (status: number, data: unknown) => ({
  isAxiosError: true,
  response: { status, data },
});

describe("apiError", () => {
  it("reads the contract's error shape", () => {
    const error = apiError(
      failed(409, {
        error: { code: "open_booking", message: "RN-24831 is still open.", details: { bookings: ["RN-24831"] } },
      })
    );
    expect(error).toEqual({
      status: 409,
      code: "open_booking",
      message: "RN-24831 is still open.",
      details: { bookings: ["RN-24831"] },
    });
  });

  it("keeps details null when the server sends none", () => {
    expect(apiError(failed(404, { error: { code: "not_found", message: "No such thing.", details: null } }))?.details).toBeNull();
  });

  it("reads a message from the old listing shape, with no code", () => {
    expect(apiError(failed(400, { error: "Image rejected" }))).toEqual({
      status: 400,
      code: null,
      message: "Image rejected",
      details: null,
    });
  });

  it("reads a message from a DRF detail", () => {
    expect(apiError(failed(401, { detail: "Token expired" }))?.message).toBe("Token expired");
  });

  it("returns a bare status for an unreadable body", () => {
    expect(apiError(failed(502, "<html>Bad gateway</html>"))).toEqual({
      status: 502,
      code: null,
      message: null,
      details: null,
    });
  });

  it("reports status 0 when no answer came back", () => {
    expect(apiError({ isAxiosError: true })?.status).toBe(0);
  });

  it("is null for anything that is not an HTTP failure", () => {
    expect(apiError(new Error("boom"))).toBeNull();
    expect(apiError(undefined)).toBeNull();
  });
});

describe("hasApiCode", () => {
  it("matches on the code only", () => {
    const error = failed(403, { error: { code: "owner_terms_required", message: "x", details: { version: "2026-10" } } });
    expect(hasApiCode(error, "owner_terms_required")).toBe(true);
    expect(hasApiCode(error, "forbidden")).toBe(false);
    expect(hasApiCode(new Error("x"), "forbidden")).toBe(false);
  });
});

describe("fieldErrors", () => {
  it("takes the first message of each field", () => {
    const error = apiError(
      failed(400, {
        error: {
          code: "validation_error",
          message: "Check the fields.",
          details: { fields: { ifsc: ["Enter 11 characters.", "Another"], holder_name: "Too short" } },
        },
      })
    );
    expect(fieldErrors(error)).toEqual({ ifsc: "Enter 11 characters.", holder_name: "Too short" });
  });

  it("is empty without field details", () => {
    expect(fieldErrors(null)).toEqual({});
    expect(fieldErrors(apiError(failed(400, { error: "nope" })))).toEqual({});
  });
});
