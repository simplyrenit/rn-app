import { describe, expect, it } from "@jest/globals";
import { fieldsLine, flagLine, pendingLine, readPendingEdit, readReasons, saveOutcome, submittedCopy } from "../listing-edit";
import { statusDetail } from "../listing-status";

/** The server's own shapes (ENG-100-api.md, review rounds 1 and 2, "Contract changes"). */
const depositZero = { code: "deposit_zero", text: "The deposit is zero" };
const held = {
  state: "flagged",
  fields: ["security_deposit"],
  changes: { security_deposit: "0.00" },
  flag_reasons: [depositZero],
};
const sentBack = { code: "staff_rejected", text: "The photo does not show the item" };
const changedSince = {
  code: "changed_after_sent_back",
  text: "Renit is looking at your change",
  sent_back_for: "The photo does not show the item",
  changed: ["title", "security deposit"],
};
const needsALook = { code: "photo_or_text", text: "A photo or the text needs a look", unchecked: true };

describe("reading what the server sends", () => {
  it("reads a held change, and nothing when there is none or it is not one", () => {
    expect(readPendingEdit(held)).toEqual(held);
    expect(readPendingEdit(null)).toBeNull();
    expect(readPendingEdit(undefined)).toBeNull();
    expect(readPendingEdit("x")).toBeNull();
    expect(readPendingEdit({ state: "checking", fields: ["title", 3], changes: 4, flag_reasons: [{ code: "a" }, depositZero] })).toEqual({
      state: "checking",
      fields: ["title"],
      changes: {},
      flag_reasons: [depositZero],
    });
  });

  it("keeps the extras a few reasons carry", () => {
    expect(readReasons([changedSince, needsALook])).toEqual([changedSince, needsALook]);
    expect(readReasons("nope")).toEqual([]);
  });
});

describe("the words", () => {
  it("names the fields in the owner's words", () => {
    expect(fieldsLine(["rate"])).toBe("price");
    expect(fieldsLine(["title", "rate", "security_deposit"])).toBe("title, price and deposit");
    expect(fieldsLine(["images", "cover_image"])).toBe("photos and cover photo");
    expect(fieldsLine(["something_new"])).toBe("something new");
    expect(fieldsLine([])).toBe("");
  });

  it("a listing staff sent back says why and what to do (T-36)", () => {
    expect(flagLine([sentBack])).toBe("Needs a change: The photo does not show the item. Edit it and we will look again.");
    // The staff's reason may already end in a full stop.
    expect(flagLine([{ code: "staff_rejected", text: "Add a clearer photo." }])).toBe("Needs a change: Add a clearer photo. Edit it and we will look again.");
  });

  it("after the owner changed something, Renit will look again and it is not live", () => {
    expect(flagLine([changedSince])).toBe(
      "Renit will look at it again. It is not live until Renit approves it. You changed: title and security deposit. Renit asked: The photo does not show the item."
    );
    expect(flagLine([changedSince, depositZero])).toContain("Also: The deposit is zero.");
  });

  it("a check that could not run is said, with staff looking", () => {
    expect(flagLine([needsALook])).toBe("A photo or the text needs a look. A check could not run, so Renit's staff will look at it.");
  });

  it("other reasons are the check's own words, joined", () => {
    expect(flagLine([depositZero, { code: "price_high", text: "The price looks too high" }])).toBe("The deposit is zero · The price looks too high");
    expect(flagLine([])).toBeNull();
    expect(flagLine(undefined)).toBeNull();
  });

  it("the status line of a flagged listing uses them", () => {
    expect(statusDetail("flagged", [sentBack])).toBe("Needs a change: The photo does not show the item. Edit it and we will look again.");
    expect(statusDetail("live", [sentBack])).toBe("Visible to renters");
  });

  it("a held change says which fields wait, why, and that customers still see the earlier version", () => {
    expect(pendingLine(readPendingEdit(held))).toBe(
      "Waiting: deposit. Needs a change: The deposit is zero. Customers still see the earlier version."
    );
    expect(pendingLine(readPendingEdit({ ...held, state: "checking" }))).toBe("Being checked: deposit. Customers still see the earlier version.");
    expect(pendingLine(readPendingEdit({ ...held, flag_reasons: [needsALook] }))).toContain("A check could not run, so Renit's staff will look at it.");
    expect(pendingLine(null)).toBeNull();
  });
});

describe("what a save says (T-34, T-35, T-36)", () => {
  const before = {
    title: "Sony PS5",
    rate: "610.00",
    security_deposit: "3000.00",
    coordinates: { lat: 19.1364, long: 72.8296 },
    status: "live",
    flag_reasons: [],
    pending_edit: null,
  };
  const sent = { title: "Sony PS5", rate: "610", security_deposit: "3000", coordinates: { lat: 19.1364, long: 72.8296 } };

  it("an applied change is 'Your product was updated!'", () => {
    expect(saveOutcome({ before, sent: { title: "PS5 console" }, answer: { ...before, title: "PS5 console" } })).toEqual({
      kind: "updated",
      title: "Your product was updated!",
    });
  });

  it("a plain Save with nothing changed says so, whatever spelling the amounts come back in", () => {
    expect(saveOutcome({ before, sent, answer: { ...before } })).toEqual({ kind: "nothing", title: "Nothing was changed" });
    // The same on a listing that already had a change waiting: nothing new.
    const waiting = { ...before, pending_edit: held };
    expect(saveOutcome({ before: waiting, sent: { title: "Sony PS5" }, answer: { ...waiting } }).kind).toBe("nothing");
  });

  it("a change that waits is not 'updated': checking, or needs a change with the server's reason", () => {
    const answer = { ...before, pending_edit: held };
    const out = saveOutcome({ before, sent: { security_deposit: "0" }, answer });
    expect(out.kind).toBe("held");
    expect(out.title).toBe("Your change is on hold");
    expect(out.message).toBe("Waiting: deposit. Needs a change: The deposit is zero. Customers still see the earlier version.");
    expect(saveOutcome({ before, sent: { security_deposit: "0" }, answer: { ...before, pending_edit: { ...held, state: "checking" } } })).toMatchObject({
      kind: "checking",
      title: "Your change is being checked",
    });
  });

  it("a held change that was there before and a new one are told apart", () => {
    const waiting = { ...before, pending_edit: held };
    const more = { ...held, fields: ["security_deposit", "rate"], changes: { security_deposit: "0.00", rate: "9999.00" } };
    expect(saveOutcome({ before: waiting, sent: { rate: "9999" }, answer: { ...waiting, pending_edit: more } }).kind).toBe("held");
  });

  it("a listing changed after staff sent it back: Renit will look at it again, and it is not suggested to be live", () => {
    const sentOn = { kind: "sent_back_again", title: "Renit will look at it again", message: "It is not live until Renit approves it." };
    const was = { ...before, status: "flagged", flag_reasons: [sentBack] };
    // The save sends it to the check again, so the answer says `checking` with the reason already rewritten (publish.py `resubmit`).
    expect(saveOutcome({ before: was, sent: { title: "PS5 console" }, answer: { ...was, status: "checking", flag_reasons: [changedSince], title: "PS5 console" } })).toEqual(sentOn);
    expect(saveOutcome({ before: was, sent: { title: "PS5 console" }, answer: { ...was, status: "flagged", flag_reasons: [changedSince], title: "PS5 console" } })).toEqual(sentOn);
    // Saved with nothing changed it is still sent back, and the screen says nothing was changed.
    expect(saveOutcome({ before: was, sent: { title: "Sony PS5" }, answer: { ...was } })).toEqual({ kind: "nothing", title: "Nothing was changed" });
  });

  it("a flagged listing saved with other reasons says it needs a change; one in the check says it is being checked", () => {
    expect(saveOutcome({ sent: { title: "x" }, answer: { status: "flagged", flag_reasons: [depositZero] } })).toEqual({
      kind: "flagged",
      title: "Saved, but it needs a change",
      message: "The deposit is zero",
    });
    expect(saveOutcome({ sent: { title: "x" }, answer: { status: "checking", flag_reasons: [] } }).kind).toBe("checking");
  });

  it("with no before (the photo screens send new files) a save is updated, and with no answer too", () => {
    expect(saveOutcome({ sent: { images: ["a"] }, answer: { status: "live" } }).kind).toBe("updated");
    expect(saveOutcome({ sent: {}, answer: null }).kind).toBe("updated");
  });
});

describe("the screen after posting from the phone (every photo is checked, not only the cover)", () => {
  it("a post that is being checked says so and that it tells the owner when the check is done", () => {
    const copy = submittedCopy("checking", []);
    expect(copy).toMatchObject({ status: "checking", title: "Submitted.\nIt's with our team now." });
    expect(copy.body).toContain("every photo on it");
    // An answer with no status reads as the normal case.
    expect(submittedCopy(undefined, undefined).status).toBe("checking");
  });

  it("a post that came back flagged says why in the check's words and what to do", () => {
    expect(submittedCopy("flagged", [{ code: "photo_or_text", text: "A photo or the text needs a look" }, depositZero])).toEqual({
      title: "Submitted, but it needs a change.",
      body: "A photo or the text needs a look · The deposit is zero. Open it from My products to change it, and we will look again.",
      status: "flagged",
    });
  });

  it("a post held because a check could not run says staff will look, not that anything is wrong with the listing", () => {
    expect(submittedCopy("flagged", [needsALook]).body).toBe(
      "A photo or the text needs a look. A check could not run, so Renit's staff will look at it. You do not need to do anything: we tell you when they have looked."
    );
  });

  it("a flagged answer with no reasons still says what to do; a live one says it is live", () => {
    expect(submittedCopy("flagged", []).body).toBe("Open it from My products to change it, and we will look again.");
    expect(submittedCopy("live", []).status).toBe("live");
  });
});
