import { describe, expect, it } from "@jest/globals";
import type { ApiError } from "../api-error";
import {
  Desk,
  HelpRequest,
  NOTE_MAX,
  deskLine,
  deskState,
  helpErrorText,
  helpRowSub,
  noteHold,
  openRequest,
  parseHelp,
  parseSent,
  requestLanded,
  requestStatus,
  sentAt,
  sentCopy,
} from "../help";

const desk: Desk = { open: "08:00", close: "24:00", is_open_now: true, text: "Every day, 8 am to midnight" };
const request = (over: Partial<HelpRequest> = {}): HelpRequest => ({
  id: 5,
  booking: "RN-24831",
  note: "The owner's shop looks closed.",
  status: "open",
  created_at: "2026-10-24T04:50:00Z",
  ...over,
});
const err = (over: Partial<ApiError> = {}): ApiError => ({ status: 400, code: null, message: null, details: null, ...over });

describe("reading the answers", () => {
  it("reads the contract's answer", () => {
    expect(parseHelp({ desk, requests: [request()] })).toEqual({ desk, requests: [request()] });
  });

  it("leaves out what is not there instead of guessing it", () => {
    expect(parseHelp(null)).toEqual({ desk: null, requests: [] });
    expect(parseHelp({ desk: { open: "08:00" }, requests: [{ id: "x" }, 4, request({ id: 9 })] })).toEqual({
      desk: null,
      requests: [request({ id: 9 })],
    });
  });

  it("reads a created request and the desk that came with it", () => {
    expect(parseSent({ request: request(), desk })).toEqual({ request: request(), desk });
    expect(parseSent({})).toEqual({ request: null, desk: null });
  });
});

describe("the desk's hours", () => {
  it("says them as the server words them", () => {
    expect(deskLine(desk)).toBe("Renit's desk: Every day, 8 am to midnight");
    expect(deskLine(null)).toBeNull();
  });

  it("says whether the desk is answering now", () => {
    expect(deskState(desk)).toBe("Open now");
    expect(deskState({ ...desk, is_open_now: false })).toBe("Closed now");
    expect(deskState(undefined)).toBeNull();
  });

  it("tells the person the desk will see the request when it opens, outside its hours", () => {
    expect(sentCopy(desk)).toEqual({ title: "Request sent", body: "Renit's desk has it and will phone you." });
    expect(sentCopy({ ...desk, is_open_now: false }).body).toBe(
      "Renit's desk is closed now. It will see your request when it opens, and phone you."
    );
    expect(sentCopy(null).body).toBe("Renit's desk has it and will phone you.");
  });
});

describe("the button's second line", () => {
  it("shows the hours", () => {
    expect(helpRowSub({ desk, requests: [] }, "RN-24831")).toBe("Renit's desk: Every day, 8 am to midnight");
  });

  it("says the desk has a request already, for this booking only", () => {
    const answer = { desk, requests: [request()] };
    expect(helpRowSub(answer, "RN-24831")).toBe("The desk has your request. Renit's desk: Every day, 8 am to midnight");
    expect(helpRowSub(answer, "RN-99999")).toBe("Renit's desk: Every day, 8 am to midnight");
    expect(helpRowSub({ desk: null, requests: [request()] }, "RN-24831")).toBe("The desk has your request.");
  });

  it("still names the desk before its hours are read", () => {
    expect(helpRowSub(undefined, "RN-24831")).toBe("Talk to Renit's desk.");
  });
});

describe("requests the desk has", () => {
  it("names the states it knows and nothing else", () => {
    expect(requestStatus("open")).toEqual({ label: "With the desk", tone: "brand" });
    expect(requestStatus("done")).toEqual({ label: "Done", tone: "success" });
    expect(requestStatus("something_new")).toBeNull();
  });

  it("finds the newest open request of a booking", () => {
    const list = [request({ id: 8, booking: "RN-2" }), request({ id: 7, status: "done" }), request({ id: 6 })];
    expect(openRequest(list, "RN-24831")?.id).toBe(6);
    expect(openRequest(list, "RN-2")?.id).toBe(8);
    expect(openRequest(list)?.id).toBe(8);
    expect(openRequest([request({ status: "done" })], "RN-24831")).toBeNull();
  });

  it("says when it was sent, by the day", () => {
    expect(sentAt(request(), new Date("2026-10-24T08:00:00Z"))).toBe("Sent 10:20 am");
    expect(sentAt(request(), new Date("2026-10-26T08:00:00Z"))).toBe("Sent Sat 24 Oct, 10:20 am");
    expect(sentAt(request({ created_at: "" }), new Date())).toBe("");
  });
});

describe("the note", () => {
  it("holds Send for an empty or a blank note", () => {
    expect(noteHold("")).toBe("Say what you need help with.");
    expect(noteHold("   \n ")).toBe("Say what you need help with.");
    expect(noteHold("The shop is closed")).toBeNull();
  });

  it("holds Send above the contract's 1,000 characters", () => {
    expect(noteHold("x".repeat(NOTE_MAX))).toBeNull();
    expect(noteHold("x".repeat(NOTE_MAX + 1))).toBe("Keep it under 1000 characters.");
  });
});

describe("a send whose answer never came", () => {
  const sent = { booking: "RN-24831", note: "The owner's shop looks closed." };

  it("is taken as sent when a request that was not there before has the same words", () => {
    expect(requestLanded([1, 2], [request({ id: 3 }), request({ id: 2 })], sent)).toBe(true);
    expect(requestLanded([1, 2], [request({ id: 3, note: "  The owner's shop looks closed.  " })], sent)).toBe(true);
  });

  it("is never taken as sent because of an older request with the same words", () => {
    expect(requestLanded([5], [request({ id: 5 })], sent)).toBe(false);
  });

  it("is not sent when the list holds nothing new, or another booking, or other words", () => {
    expect(requestLanded([], [], sent)).toBe(false);
    expect(requestLanded([], [request({ booking: "RN-1" })], sent)).toBe(false);
    expect(requestLanded([], [request({ note: "Something else" })], sent)).toBe(false);
  });
});

describe("what a refusal says", () => {
  it("uses the server's own words for a bad note", () => {
    expect(
      helpErrorText(err({ code: "validation_error", details: { fields: { note: ["Ensure this field has no more than 1000 characters."] } } }))
    ).toBe("Ensure this field has no more than 1000 characters.");
    expect(helpErrorText(err({ code: "validation_error" }))).toBe("The request was not sent. Check what you wrote and try again.");
  });

  it("says plainly when the booking is not found, the rate is hit, or the server fell over", () => {
    expect(helpErrorText(err({ status: 404, code: "not_found" }))).toBe("We could not find that booking, so the request was not sent.");
    expect(helpErrorText(err({ status: 429, code: "rate_limited" }))).toBe("You have sent several requests in a row. Wait a minute and try again.");
    expect(helpErrorText(err({ status: 503 }))).toBe("Renit's server had a problem, so the request was not sent. Try again in a moment.");
  });

  it("blames the connection when nothing answered", () => {
    expect(helpErrorText(null)).toBe("We could not reach Renit. Check your connection and try again.");
    expect(helpErrorText(err({ status: 0 }))).toBe("We could not reach Renit. Check your connection and try again.");
  });
});
