import { describe, expect, it } from "@jest/globals";
import { apiError } from "@/lib/api-error";
import { NAME_LOCKED, NAME_LOCKED_IN_PROGRESS, nameLockNote, nameSaveOutcome } from "@/lib/name-change";
import { AxiosError, AxiosHeaders } from "axios";

const refused = (status: number, data: unknown) =>
  apiError(
    new AxiosError("refused", "ERR_BAD_REQUEST", undefined, undefined, {
      status,
      data,
      statusText: "",
      headers: {},
      config: { headers: new AxiosHeaders() },
    })
  );

describe("a refused name save", () => {
  it("says the name is locked, in the server's words, and puts the saved name back", () => {
    const locked = refused(400, {
      error: { code: "locked_while_verified", message: "Contact support to change this while verified.", details: { fields: ["first_name"] } },
    });
    expect(nameSaveOutcome(locked)).toEqual({ text: "Contact support to change this while verified.", restore: true });
  });

  it("says it in the app's words when the server gives none", () => {
    expect(nameSaveOutcome(refused(400, { error: { code: "locked_while_verified" } }))).toEqual({
      text: NAME_LOCKED,
      restore: true,
    });
    expect(NAME_LOCKED).toBe("Your name is locked while you're verified. Contact support to change it.");
  });

  it("keeps what was typed for anything else, and never says nothing", () => {
    expect(nameSaveOutcome(refused(400, { detail: "Name too long." }))).toEqual({ text: "Name too long.", restore: false });
    expect(nameSaveOutcome(refused(500, "<html>")).text).toBe("We couldn't save your name. Try again.");
    expect(nameSaveOutcome(null).text).toContain("couldn't reach Renit");
  });
});

describe("whether the name can be changed", () => {
  it("is locked while verified, and says so", () => {
    expect(nameLockNote(true, undefined)).toBe(NAME_LOCKED);
    expect(nameLockNote(true, "none")).toBe(NAME_LOCKED);
    expect(nameLockNote(undefined, "verified")).toBe(NAME_LOCKED);
  });

  it("is locked while a verification is open, without calling the person verified", () => {
    for (const status of ["pending", "action_required", "in_review"] as const) {
      expect(nameLockNote(false, status)).toBe(NAME_LOCKED_IN_PROGRESS);
    }
    expect(NAME_LOCKED_IN_PROGRESS).toBe(
      "Your name can't be changed while your verification is in progress. Contact support to change it."
    );
  });

  it("is open otherwise, including before the status is known", () => {
    expect(nameLockNote(false, "none")).toBeNull();
    expect(nameLockNote(false, "rejected")).toBeNull();
    expect(nameLockNote(undefined, undefined)).toBeNull();
  });
});
