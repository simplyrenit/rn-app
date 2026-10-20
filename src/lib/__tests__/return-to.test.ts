import { describe, expect, it, jest } from "@jest/globals";
import { goAfterSignIn, rememberReturnTo, takeReturnTo } from "../return-to";

const listing = {
  name: "ProductDetail" as const,
  params: { id: "PRO_8fk2Lq", dates: { first_day: "2026-10-24", last_day: "2026-10-26" } },
};

describe("where sign-in returns to", () => {
  it("hands the listing and its dates back once", () => {
    rememberReturnTo(listing, 1_000);
    expect(takeReturnTo(2_000)).toEqual(listing);
    expect(takeReturnTo(3_000)).toBeNull();
  });

  it("forgets a place nobody came back to in time", () => {
    rememberReturnTo(listing, 0);
    expect(takeReturnTo(16 * 60 * 1000)).toBeNull();
  });

  it("is nothing when the app never asked", () => {
    expect(takeReturnTo()).toBeNull();
  });
});

describe("goAfterSignIn", () => {
  it("puts the listing back on top of the tabs, dates kept", () => {
    const navigation = { navigate: jest.fn(), reset: jest.fn() };
    rememberReturnTo(listing);
    goAfterSignIn(navigation as never);
    expect(navigation.reset).toHaveBeenCalledWith({ index: 1, routes: [{ name: "MainTabs" }, listing] });
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it("goes to the tabs as before when there is nowhere to return to", () => {
    const navigation = { navigate: jest.fn(), reset: jest.fn() };
    goAfterSignIn(navigation as never);
    expect(navigation.navigate).toHaveBeenCalledWith("MainTabs");
    expect(navigation.reset).not.toHaveBeenCalled();
  });
});

describe("back to the same search after signing in (ENG-292)", () => {
  it("rebuilds the results with their text, place and dates", () => {
    const search = {
      name: "SearchResults" as const,
      params: {
        selectedItem: "air cooler",
        address: "Andheri West",
        coords: { lat: 19.13, lng: 72.83 },
        range: { startDate: "2026-10-24T00:00:00.000Z", endDate: "2026-10-26T00:00:00.000Z" },
        products: [],
      },
    };
    const navigation = { navigate: jest.fn(), reset: jest.fn() };
    rememberReturnTo(search);
    goAfterSignIn(navigation as never);
    expect(navigation.reset).toHaveBeenCalledWith({ index: 1, routes: [{ name: "MainTabs" }, search] });
  });
});
