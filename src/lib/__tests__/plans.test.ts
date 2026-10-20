import { describe, expect, it } from "@jest/globals";
import {
  aUnitLabel,
  minDays,
  minimumLine,
  minimumWords,
  perDay,
  plansOf,
  priceLabel,
  smallestPlan,
  worksOutLine,
  type Plan,
} from "../plans";

const CAMERA: Plan[] = [
  { unit: "month", price: "7000.00", min: 1 },
  { unit: "day", price: "450.00", min: 3 },
  { unit: "week", price: "2500.00", min: 1 },
];
const SOFA: Plan[] = [{ unit: "month", price: "1800.00", min: 6 }];

describe("plans", () => {
  it("reads a product from an older server as a day plan at its rate", () => {
    expect(plansOf({ rate: "610.00" })).toEqual([{ unit: "day", price: "610.00", min: 1 }]);
    expect(plansOf({ rate: null })).toEqual([]);
    expect(plansOf({ plans: [], rate: "0" })).toEqual([]);
    expect(plansOf({ plans: CAMERA, rate: "450.00" }).map((p) => p.unit)).toEqual(["day", "week", "month"]);
  });

  it("shows the smallest unit's price on a card", () => {
    expect(smallestPlan(CAMERA)?.unit).toBe("day");
    expect(priceLabel({ plans: CAMERA })).toBe("₹450 per day");
    expect(priceLabel({ plans: SOFA })).toBe("₹1,800 per month");
    expect(priceLabel({ rate: "" })).toBeNull();
    expect(aUnitLabel(SOFA[0])).toBe("₹1,800 a month");
  });

  it("works out a day of a plan", () => {
    expect(perDay(CAMERA[2])).toBe(357.14);
    expect(perDay(SOFA[0])).toBe(60);
    expect(worksOutLine(CAMERA[2])).toBe("Works out to ₹357 a day");
    expect(worksOutLine(CAMERA[1])).toBeNull();
  });

  it("says the shortest booking a listing allows", () => {
    expect(minDays(CAMERA)).toBe(3);
    expect(minDays(SOFA)).toBe(180);
    expect(minDays([])).toBe(1);
    expect(minimumWords(CAMERA)).toBe("3 days");
    expect(minimumWords(SOFA)).toBe("6 months");
    expect(minimumWords([{ unit: "week", price: "2500.00", min: 1 }])).toBe("1 week");
    expect(minimumLine(SOFA)).toBe("Minimum rental · 6 months");
    expect(minimumLine([{ unit: "day", price: "610.00", min: 1 }])).toBeNull();
  });
});
