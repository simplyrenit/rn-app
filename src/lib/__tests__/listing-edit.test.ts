import { describe, expect, it } from "@jest/globals";
import { changedSinceSentBack, fieldsLine, flagLine, ownerView, pendingLine, readPendingEdit, waitsForStaff, readReasons, saveOutcome, submittedCopy } from "../listing-edit";
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

  it("a sent-back listing the owner has changed says Renit will look again while it is still `checking`, never 'usually takes seconds'", () => {
    const again = statusDetail("checking", [changedSince]);
    expect(again).toContain("Renit will look at it again. It is not live until Renit approves it.");
    expect(again).not.toMatch(/seconds/);
    // A listing in the ordinary check keeps its own line; one flagged by the job says the same as while it was checking.
    expect(statusDetail("checking", [])).toBe("Not visible to renters yet · usually takes seconds");
    expect(statusDetail("checking", [depositZero])).toBe("Not visible to renters yet · usually takes seconds");
    expect(statusDetail("flagged", [changedSince])).toBe(again);
    expect(changedSinceSentBack([sentBack, changedSince])).toBe(true);
    expect(changedSinceSentBack([sentBack])).toBe(false);
    expect(changedSinceSentBack(undefined)).toBe(false);
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
    // A check that could not run asks nothing of the owner: its own sentence, never "Needs a change".
    expect(pendingLine(readPendingEdit({ ...held, flag_reasons: [needsALook] }))).toBe(
      "Waiting: deposit. Renit's staff will look at it: a check could not run. Customers still see the earlier version."
    );
    expect(pendingLine(readPendingEdit({ ...held, flag_reasons: [depositZero, needsALook] }))).toBe(
      "Waiting: deposit. Needs a change: The deposit is zero. Renit's staff will look at it: a check could not run. Customers still see the earlier version."
    );
    expect(waitsForStaff(readPendingEdit({ ...held, flag_reasons: [needsALook] }))).toBe(true);
    expect(waitsForStaff(readPendingEdit(held))).toBe(false);
    expect(waitsForStaff(readPendingEdit({ ...held, flag_reasons: [depositZero, needsALook] }))).toBe(false);
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

  it("a change that waits only because a check could not run is 'Renit's staff will look at your change', not on hold", () => {
    const unchecked = { ...held, flag_reasons: [needsALook] };
    const out = saveOutcome({ before, sent: { security_deposit: "0" }, answer: { ...before, pending_edit: unchecked } });
    expect(out.kind).toBe("held");
    expect(out.title).toBe("Renit's staff will look at your change");
    expect(out.message).not.toMatch(/Needs a change/);
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

  it("a check that could not run is read whatever the status the post answers: its own heading, staff will look, nothing asked of the owner", () => {
    const staff = {
      title: "Submitted.\nRenit's staff will look at it.",
      body: "A check could not run on your listing just now, so a person at Renit will look at it before renters can see it. You do not need to do anything: we tell you when they have looked.",
    };
    // A new post: the server stores the mark and still answers `checking`.
    expect(submittedCopy("checking", [needsALook])).toEqual({ ...staff, status: "checking" });
    expect(submittedCopy("flagged", [needsALook])).toEqual({ ...staff, status: "flagged" });
    expect(submittedCopy("flagged", [needsALook]).title).not.toMatch(/needs a change/);
  });

  it("a finding and a check that could not run together: needs a change for the finding, and staff will look for the other", () => {
    expect(submittedCopy("flagged", [depositZero, needsALook])).toEqual({
      title: "Submitted, but it needs a change.",
      body: "The deposit is zero. A check also could not run, so Renit's staff will look at it. Open it from My products to change it, and we will look again.",
      status: "flagged",
    });
    // While the answer still says checking, a finding is not yet something to change: the job flags it seconds later.
    expect(submittedCopy("checking", [depositZero]).title).toBe("Submitted.\nIt's with our team now.");
  });

  it("a flagged answer with no reasons still says what to do; a live one says it is live", () => {
    expect(submittedCopy("flagged", []).body).toBe("Open it from My products to change it, and we will look again.");
    expect(submittedCopy("live", []).status).toBe("live");
  });
});

describe("the details form saved over a change that waits (review app-e2e-3 r1, finding 1)", () => {
  // The owner's object as the phone's list and detail answer it, a live listing with a change waiting. The top-level values
  // are the ones customers see; the waiting ones are only in `pending_edit.changes` (product/publish.py `pending_edit`).
  const live = {
    name: "ps5-1",
    title: "Sony PS5",
    description: "Console with two controllers.",
    condition: "good",
    brand_name: "Sony",
    model_name: "CFI-1200",
    usage_description: "Gaming",
    location: "Andheri West",
    contact_name: "Meera J",
    contact_number: "+919876543210",
    rate: "610.00",
    security_deposit: "3000.00",
    worth: "45000.00",
    quantity: 1,
    status: "live",
    flag_reasons: [],
    pending_edit: null,
  };
  /** What the details form sends: the twelve checked fields from the boxes, the amounts as the box holds them. */
  const wholeForm = (view: Record<string, any>, over: Record<string, unknown> = {}) => ({
    title: view.title,
    brand_name: view.brand_name,
    model_name: view.model_name,
    condition: view.condition,
    description: view.description,
    location: view.location,
    usage_description: view.usage_description,
    rate: `${parseFloat(view.rate)}`,
    security_deposit: `${parseFloat(view.security_deposit)}`,
    worth: `${parseFloat(view.worth)}`,
    contact_name: view.contact_name,
    contact_number: view.contact_number,
    quantity: view.quantity,
    ...over,
  });

  it("lays the waiting values over the listing for the form, and leaves everything else and the object itself alone", () => {
    const held = { state: "flagged", fields: ["title", "security_deposit"], changes: { title: "Gamo air rifle", security_deposit: "0.00" }, flag_reasons: [depositZero] };
    const waiting = { ...live, pending_edit: held };
    const view = ownerView(waiting);
    expect(view).toMatchObject({ title: "Gamo air rifle", security_deposit: "0.00", rate: "610.00", description: live.description });
    expect(waiting.title).toBe("Sony PS5");
    expect(ownerView(view)).toEqual(view);
    expect(ownerView(live)).toBe(live);
    // A category is an object on the listing and an id in a change: never laid over.
    expect(ownerView({ ...waiting, category: { id: 7 }, pending_edit: { ...held, fields: ["category"], changes: { category: 9 } } }).category).toEqual({ id: 7 });
  });

  describe("case a: a title waits and the owner taps Update product with nothing changed", () => {
    const held = { state: "flagged", fields: ["title"], changes: { title: "Gamo air rifle" }, flag_reasons: [{ code: "not_allowed", text: "Renit does not allow this item" }] };
    const waiting = { ...live, pending_edit: held };

    it("the form sends the held title back: the server reads it as no change and answers the same, so nothing was changed", () => {
      const sent = wholeForm(ownerView(waiting));
      expect(sent.title).toBe("Gamo air rifle");
      // The server's answer (publish.py `current` is the held value; the held change is kept as it was): the same listing.
      expect(saveOutcome({ before: waiting, sent, answer: { ...waiting } })).toEqual({ kind: "nothing", title: "Nothing was changed" });
    });

    it("the form as it was (the title customers see sent back) takes the waiting title out: that is a withdrawal, never 'updated'", () => {
      const sent = wholeForm(live);
      // The server's answer (publish.py:375-386, :490-491): the held title is put back, the held change is deleted.
      const out = saveOutcome({ before: waiting, sent, answer: { ...live } });
      expect(out).toEqual({
        kind: "withdrawn",
        title: "Your waiting change was withdrawn",
        message: "The title you had waiting went back to what customers see.",
      });
    });
  });

  describe("case b: a price and a deposit wait, and the owner fixes the deposit", () => {
    const held = {
      state: "flagged",
      fields: ["rate", "security_deposit"],
      changes: { rate: "700.00", security_deposit: "500.00" },
      flag_reasons: [{ code: "deposit_low", text: "The deposit is less than one day's rent" }],
    };
    const waiting = { ...live, pending_edit: held };

    it("the form shows the waiting 700 and 500, the deposit is set to 800 and the price goes back as 700", () => {
      const view = ownerView(waiting);
      expect([view.rate, view.security_deposit]).toEqual(["700.00", "500.00"]);
      const sent = wholeForm(view, { security_deposit: "800" });
      expect(sent.rate).toBe("700");
      // The server's answer: the price is the held one sent again (no change), the deposit is new; the group passes as a
      // whole, so both are applied and nothing waits (publish.py: held group re-checked, `passed`).
      const answer = { ...live, rate: "700.00", security_deposit: "800.00", pending_edit: null };
      expect(saveOutcome({ before: waiting, sent, answer })).toEqual({ kind: "updated", title: "Your product was updated!" });
    });

    it("with the price sent as customers see it (the old form) the held 700 would have been dropped, and that is said", () => {
      const sent = wholeForm(live, { security_deposit: "800" });
      // The server's answer: the price is put back at 610, the deposit passes and is applied.
      const answer = { ...live, rate: "610.00", security_deposit: "800.00", pending_edit: null };
      const out = saveOutcome({ before: waiting, sent, answer });
      expect(out.kind).toBe("updated");
      expect(out.message).toBe("The price you had waiting went back to what customers see.");
    });
  });

  describe("case c: a title and a description wait together and the owner types a new title", () => {
    const held = {
      state: "flagged",
      fields: ["title", "description"],
      changes: { title: "Gamo air rifle", description: "A new description." },
      flag_reasons: [{ code: "not_allowed", text: "Renit does not allow this item" }],
    };
    const waiting = { ...live, pending_edit: held };

    it("the description goes back as the waiting one and is not lost: the new title passes and both are applied", () => {
      const sent = wholeForm(ownerView(waiting), { title: "Sony PlayStation 5" });
      expect(sent.description).toBe("A new description.");
      const answer = { ...live, title: "Sony PlayStation 5", description: "A new description.", pending_edit: null };
      expect(saveOutcome({ before: waiting, sent, answer })).toEqual({ kind: "updated", title: "Your product was updated!" });
    });
  });

  describe("case d: a text change waits only because a check could not run", () => {
    const held = { state: "flagged", fields: ["description"], changes: { description: "Edited." }, flag_reasons: [needsALook] };
    const waiting = { ...live, pending_edit: held };

    it("a later save of the quantity sends the waiting description back as it is, and the server decides it again by its rules", () => {
      const sent = wholeForm(ownerView(waiting), { quantity: 2 });
      expect(sent.description).toBe("Edited.");
      // The server's answer once the text check can run (the next save "decides each group by its own rules again"): the
      // description is clean, so it is applied; the quantity is saved at once. Nothing is thrown away.
      const applied = { ...live, description: "Edited.", quantity: 2, pending_edit: null };
      expect(saveOutcome({ before: waiting, sent, answer: applied })).toEqual({ kind: "updated", title: "Your product was updated!" });
      // And if the check still cannot run, the change keeps waiting and the quantity is saved: said so.
      const still = { ...live, quantity: 2, pending_edit: held };
      expect(saveOutcome({ before: waiting, sent, answer: still })).toEqual({
        kind: "updated",
        title: "Your product was updated!",
        message: "An earlier change still waits: description.",
      });
    });
  });
});

describe("a save is 'on hold' only for a change of its own (review app-e2e-3 r1, finding 2)", () => {
  const heldTitle = {
    state: "flagged",
    fields: ["title"],
    changes: { title: "Gamo air rifle" },
    flag_reasons: [{ code: "not_allowed", text: "Renit does not allow this item" }],
  };
  const listing = { name: "ps5-1", title: "Sony PS5", quantity: 1, status: "live", flag_reasons: [], pending_edit: heldTitle, blocked_dates: [{ start_date: "2026-10-24", end_date: "2026-10-26" }] };

  it("the dates are saved at once while a title waits: updated, with a word on the title that still waits, not 'on hold'", () => {
    const sent = { blocked_dates: [{ start_date: "2026-10-24", end_date: "2026-10-26" }, { start_date: "2026-11-07", end_date: "2026-11-08" }] };
    const answer = { ...listing, blocked_dates: sent.blocked_dates };
    expect(saveOutcome({ before: { blocked_dates: listing.blocked_dates }, sent, answer })).toEqual({
      kind: "updated",
      title: "Your product was updated!",
      message: "An earlier change still waits: title.",
    });
  });

  it("a quantity changed beside a held title in the details form is applied at once: updated, the title still waits", () => {
    const sent = { title: "Gamo air rifle", quantity: 2 };
    expect(saveOutcome({ before: listing, sent, answer: { ...listing, quantity: 2 } })).toEqual({
      kind: "updated",
      title: "Your product was updated!",
      message: "An earlier change still waits: title.",
    });
  });

  it("a new held value in this save is this save's: on hold", () => {
    const more = { ...heldTitle, fields: ["title", "rate"], changes: { title: "Gamo air rifle", rate: "9999.00" }, flag_reasons: [{ code: "price_high", text: "The price looks too high" }] };
    const sent = { title: "Gamo air rifle", rate: "9999" };
    expect(saveOutcome({ before: { ...listing, rate: "610.00" }, sent, answer: { ...listing, rate: "610.00", pending_edit: more } }).kind).toBe("held");
    // And a held title changed again to another waiting title.
    const other = { ...heldTitle, changes: { title: "Another" } };
    expect(saveOutcome({ before: listing, sent: { title: "Another" }, answer: { ...listing, pending_edit: other } }).kind).toBe("held");
  });

  it("the same dates again, in any order, say nothing was changed", () => {
    const dates = [{ start_date: "2026-11-07", end_date: "2026-11-08" }, { start_date: "2026-10-24", end_date: "2026-10-26" }];
    expect(
      saveOutcome({
        before: { blocked_dates: dates },
        sent: { blocked_dates: [...dates].reverse() },
        answer: { ...listing, blocked_dates: [dates[1], dates[0]] },
      })
    ).toEqual({ kind: "nothing", title: "Nothing was changed" });
  });

  it("choosing the category the listing has says nothing was changed; another one is updated", () => {
    const sent = (id: number) => ({ category: { id, parent: "Gaming", title: "Consoles" } });
    const answer = (id: number) => ({ ...listing, pending_edit: null, category: { id, title: "Consoles" } });
    expect(saveOutcome({ before: { category: { id: 7 } }, sent: sent(7), answer: answer(7) })).toEqual({ kind: "nothing", title: "Nothing was changed" });
    expect(saveOutcome({ before: { category: { id: 7 } }, sent: sent(9), answer: answer(9) }).kind).toBe("updated");
    // A screen that does not know what the listing has cannot say nothing changed.
    expect(saveOutcome({ sent: sent(7), answer: answer(7) }).kind).toBe("updated");
  });
});

describe("a place line waits with its pin (review app-e2e-3 r2, finding 7; oe-api-int a11bb38)", () => {
  const here = { lat: 19.1364, long: 72.8296 };
  const bandra = { lat: 19.0596, long: 72.8347 };
  const juhu = { lat: 19.1075, long: 72.8296 };
  const live = {
    name: "ps5-1",
    title: "Sony PS5",
    location: "Andheri West, Mumbai",
    full_address: "Shop 4",
    coordinates: here,
    rate: "610.00",
    quantity: 1,
    status: "live",
    flag_reasons: [],
    pending_edit: null,
  };
  /** The server's shape (ENG-95-api.md, pass 2b): the place line with its pin and full address, and the title with them. */
  const held = {
    state: "flagged",
    fields: ["title", "location", "coordinates", "full_address"],
    changes: { title: "Gamo air rifle", location: "badword lane", coordinates: bandra, full_address: "Flat 2, Bandra" },
    flag_reasons: [{ code: "photo_or_text", text: "A photo or the text needs a look" }],
  };
  const waiting = { ...live, pending_edit: held };
  const form = (view: Record<string, any>, over: Record<string, unknown> = {}) => ({
    title: view.title,
    location: view.location,
    coordinates: view.coordinates,
    rate: `${parseFloat(view.rate)}`,
    quantity: view.quantity,
    ...over,
  });

  it("lays the waiting pin and full address over the listing, like the rest", () => {
    const view = ownerView(waiting);
    expect(view).toMatchObject({ location: "badword lane", coordinates: bandra, full_address: "Flat 2, Bandra" });
    expect(waiting.coordinates).toEqual(here);
    expect(fieldsLine(held.fields)).toBe("title, address, pin on the map and full address");
  });

  it("(a) the owner fixes the title and saves: the waiting pin goes back as it waits, and the whole place goes live with its pin", () => {
    const view = ownerView(waiting);
    const sent = form(view, { title: "Sony PlayStation 5" });
    expect(sent.coordinates).toEqual(bandra);
    // The server: the place line and the pin are sent as they wait (no change), the new title is clean, nothing is refused
    // any more: the whole held change is applied, the new place line with the new pin (drafts/tests_edits.py).
    const answer = { ...live, title: "Sony PlayStation 5", location: "badword lane", full_address: "Flat 2, Bandra", coordinates: bandra, pending_edit: null };
    expect(saveOutcome({ before: waiting, sent, answer })).toEqual({ kind: "updated", title: "Your product was updated!" });
  });

  it("(a2) a plain Save, or a quantity changed beside it: the waiting pin is left alone, nothing is swapped, and it is said", () => {
    const plain = saveOutcome({ before: waiting, sent: form(ownerView(waiting)), answer: { ...waiting } });
    expect(plain).toEqual({ kind: "nothing", title: "Nothing was changed" });
    // The quantity is saved at once; the place line, its pin and the title still wait (the test's `again` answer).
    const more = saveOutcome({ before: waiting, sent: form(ownerView(waiting), { quantity: 3 }), answer: { ...waiting, quantity: 3 } });
    expect(more).toEqual({
      kind: "updated",
      title: "Your product was updated!",
      message: "An earlier change still waits: title, address, pin on the map and full address.",
    });
  });

  it("(b) the owner moves only the pin while the place line waits: it waits too, never 'Nothing was changed'", () => {
    const sent = form(ownerView(waiting), { coordinates: juhu });
    // The server: the pin sent alone replaces the waiting pin in the held change; the listing's own pin does not move.
    const answer = { ...waiting, pending_edit: { ...held, changes: { ...held.changes, coordinates: juhu } } };
    const out = saveOutcome({ before: waiting, sent, answer });
    expect(out.kind).toBe("held");
    expect(out.title).toBe("Your change is on hold");
    expect(out.message).toContain("The new pin waits with the address.");
  });

  it("a place moved on a live listing with nothing waiting (line and pin together) waits together, and says so", () => {
    const sent = form(live, { location: "badword lane", coordinates: bandra });
    const answer = {
      ...live,
      pending_edit: { state: "flagged", fields: ["location", "coordinates", "full_address"], changes: { location: "badword lane", coordinates: bandra, full_address: "Shop 4" }, flag_reasons: held.flag_reasons },
    };
    const out = saveOutcome({ before: live, sent, answer });
    expect(out.kind).toBe("held");
    expect(out.message).toContain("Waiting: address, pin on the map and full address.");
    expect(out.message).toContain("The new pin waits with the address.");
  });
});
