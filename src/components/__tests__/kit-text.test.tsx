import { describe, expect, it, jest } from "@jest/globals";

// The resolver is pure; the theme hook would pull the whole global context in.
jest.mock("@/lib/theme", () => ({ useTheme: () => ({ color: {} }) }));

// eslint-disable-next-line import/first
import { resolveTextMetrics } from "../core/text";

describe("Text metrics on the 2.1 kit (ENG-426)", () => {
  it("gives each weight its own face, so SemiBold and Medium are no longer Bold and Regular", () => {
    const face = (fontWeight: any) => resolveTextMetrics({ fontWeight }).fontFamily;
    expect(face("font-normal")).toBe("PlusJakartaSans-Regular");
    expect(face("font-medium")).toBe("PlusJakartaSans-Medium");
    expect(face("font-semibold")).toBe("PlusJakartaSans-SemiBold");
    expect(face("font-bold")).toBe("PlusJakartaSans-Bold");
    expect(face(undefined)).toBe("PlusJakartaSans-Regular");
  });

  it("sets the kit's size/leading pairs: 12/16, 14/20, 16/24, 18/24, 20/28", () => {
    const pair = (fontSize: any) => {
      const m = resolveTextMetrics({ fontSize });
      return [m.fontSize, m.lineHeight];
    };
    expect(pair("text-xs")).toEqual([12, 16]);
    expect(pair("text-sm")).toEqual([14, 20]);
    expect(pair("text-md")).toEqual([16, 24]);
    expect(pair("text-base")).toEqual([18, 24]);
    expect(pair("text-lg")).toEqual([20, 28]);
  });

  it("takes the leading from a className size when no size prop is given", () => {
    const m = resolveTextMetrics({ className: "flex-1 text-sm px-2" });
    // NativeWind sets the 14pt size from the class; the component only owns the leading.
    expect(m.fontSize).toBeUndefined();
    expect(m.lineHeight).toBe(20);
    expect(resolveTextMetrics({ className: "text-xs" }).lineHeight).toBe(16);
    // No size anywhere: the base leading, as before.
    expect(resolveTextMetrics({}).lineHeight).toBe(24);
    // Colour classes are not sizes.
    expect(resolveTextMetrics({ className: "text-danger-light" }).lineHeight).toBe(24);
  });

  it("lets the size prop, then the role, beat a className size, and an explicit lineHeight beat all", () => {
    expect(resolveTextMetrics({ className: "text-xs", fontSize: "text-lg" }).lineHeight).toBe(28);
    expect(resolveTextMetrics({ className: "text-xs", role: "sectionTitle" }).lineHeight).toBe(24);
    expect(resolveTextMetrics({ fontSize: "text-sm", lineHeight: 21 }).lineHeight).toBe(21);
  });

  it("resolves the roles to the kit: 20 Bold, 18 Bold, 14 SemiBold, 14 SemiBold, 12 Regular", () => {
    const r = (role: any) => {
      const m = resolveTextMetrics({ role });
      return [m.fontSize, m.lineHeight, m.fontFamily];
    };
    expect(r("screenTitle")).toEqual([20, 28, "PlusJakartaSans-Bold"]);
    expect(r("sectionTitle")).toEqual([18, 24, "PlusJakartaSans-Bold"]);
    expect(r("groupHeader")).toEqual([14, 20, "PlusJakartaSans-SemiBold"]);
    expect(r("fieldLabel")).toEqual([14, 20, "PlusJakartaSans-SemiBold"]);
    expect(r("fieldHint")).toEqual([12, 16, "PlusJakartaSans-Regular"]);
  });
});
