import { describe, expect, it } from "@jest/globals";
import { sessionIdFromToken } from "../session";

/** A token with this payload. Only the middle part is read. */
const token = (payload: object) =>
  `e30.${Buffer.from(JSON.stringify(payload)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_")}.sig`;

describe("sessionIdFromToken", () => {
  it("reads the sid claim: the session this phone signed in with", () => {
    expect(sessionIdFromToken(token({ sid: 31, exp: 1790000000 }))).toBe(31);
  });

  it("reads a sid that came as text", () => {
    expect(sessionIdFromToken(token({ sid: "27" }))).toBe(27);
  });

  it("reads a payload whose base64 needed padding and url-safe letters", () => {
    expect(sessionIdFromToken(token({ sid: 5, name: "???>>>" }))).toBe(5);
  });

  it("is null for a token with no sid (an older server's), and for anything unreadable", () => {
    expect(sessionIdFromToken(token({ exp: 1 }))).toBeNull();
    expect(sessionIdFromToken(token({ sid: "abc" }))).toBeNull();
    expect(sessionIdFromToken(token({ sid: 1.5 }))).toBeNull();
    expect(sessionIdFromToken("not-a-token")).toBeNull();
    expect(sessionIdFromToken("a.%%%.c")).toBeNull();
    expect(sessionIdFromToken("")).toBeNull();
    expect(sessionIdFromToken(null)).toBeNull();
    expect(sessionIdFromToken(undefined)).toBeNull();
  });
});
