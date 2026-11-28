import { describe, expect, it } from "@jest/globals";
import { nameAfterProvider } from "../provider-name";

describe("nameAfterProvider", () => {
  it("leaves a named account alone", () => {
    expect(nameAfterProvider({ first_name: "Asha", last_name: "Kapoor" }, { first: "A", last: "K" })).toEqual({ save: null, ask: null });
  });

  it("saves the provider's whole name on an account with none (Apple's only chance)", () => {
    expect(nameAfterProvider({ first_name: "", last_name: "" }, { first: " Asha ", last: "Kapoor" })).toEqual({
      save: { first_name: "Asha", last_name: "Kapoor" },
      ask: null,
    });
  });

  it("completes an account's half name from the provider, keeping what the account has", () => {
    expect(nameAfterProvider({ first_name: "Asha", last_name: "" }, { first: "Ash", last: "Kapoor" })).toEqual({
      save: { first_name: "Asha", last_name: "Kapoor" },
      ask: null,
    });
  });

  it("never saves half a name: it asks, prefilled", () => {
    expect(nameAfterProvider({ first_name: null, last_name: null }, { first: "Asha" })).toEqual({
      save: null,
      ask: { firstName: "Asha", lastName: "" },
    });
    expect(nameAfterProvider({}, {})).toEqual({ save: null, ask: { firstName: "", lastName: "" } });
  });
});
