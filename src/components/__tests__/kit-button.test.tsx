import { describe, expect, it, jest } from "@jest/globals";
import { darkColors, lightColors } from "@/lib/design-tokens";

jest.mock("@/lib/theme", () => ({ useTheme: () => ({ color: {}, isDark: false }) }));
jest.mock("@/lib/haptics", () => ({ tapFeedback: () => {} }));

// eslint-disable-next-line import/first
import { resolveButtonStyle } from "../core/button";

const resolve = (
  variant: "primary" | "outline" | "warning" | "ghost",
  extra: { size?: "default" | "compact"; tone?: "tonal" | "brand" | "muted"; blocked?: boolean } = {}
) =>
  resolveButtonStyle(
    { variant, size: extra.size ?? "default", tone: extra.tone, blocked: extra.blocked ?? false },
    lightColors,
    false
  );

describe("Button on the 2.1 kit (ENG-426)", () => {
  it("draws the kit Primary: 52 minimum high, r11, purple fill, white 16/24 SemiBold; compact is 44 with 14/20", () => {
    const { container, label } = resolve("primary");
    expect(container).toMatchObject({ minHeight: 52, borderRadius: 11, backgroundColor: "#635BE8" });
    // minHeight, never height, and no vertical padding: one line at the default size is exactly 52, a larger text size grows it.
    expect(container.height).toBeUndefined();
    expect(container.paddingVertical).toBeUndefined();
    expect(label).toEqual({ color: "#FFFFFF", fontSize: "text-md", fontWeight: "font-semibold", lineHeight: 24 });
    const compact = resolve("primary", { size: "compact" });
    expect(compact.container.minHeight).toBe(44);
    expect(compact.label).toMatchObject({ fontSize: "text-sm", lineHeight: 20 });
  });

  it("draws a disabled Primary lavender with its white label", () => {
    const { container, label } = resolve("primary", { blocked: true });
    expect(container.backgroundColor).toBe("#CAC8F7");
    expect(label.color).toBe("#FFFFFF");
  });

  it("draws outline as the kit Secondary: white, #CAC8F7 edge, purple 14/21 SemiBold, the faint ring", () => {
    const { container, label } = resolve("outline");
    expect(container).toMatchObject({
      minHeight: 52,
      borderRadius: 12,
      backgroundColor: "#FFFFFF",
      borderWidth: 1,
      borderColor: "#CAC8F7",
      shadowColor: "#000000",
      shadowOpacity: 0.04,
    });
    expect(label).toEqual({ color: "#635BE8", fontSize: "text-sm", fontWeight: "font-semibold", lineHeight: 21 });
    expect(resolve("outline", { size: "compact" }).container.minHeight).toBe(44);
  });

  it("draws tone=tonal as the #EDEDFC Secondary with no edge and a 14/20 label", () => {
    const { container, label } = resolve("outline", { tone: "tonal", size: "compact" });
    expect(container).toMatchObject({ minHeight: 44, backgroundColor: "#EDEDFC", paddingHorizontal: 20 });
    expect(container.borderWidth).toBeUndefined();
    expect(label).toMatchObject({ color: "#635BE8", lineHeight: 20 });
  });

  it("draws ghost as the 44-high Text button, Bold 14/21, purple or 70% black", () => {
    for (const size of ["default", "compact"] as const) {
      const { container, label } = resolve("ghost", { size });
      expect(container).toMatchObject({ minHeight: 44, paddingHorizontal: 0, backgroundColor: "transparent" });
      expect(container.height).toBeUndefined();
      expect(label).toEqual({ color: "#635BE8", fontSize: "text-sm", fontWeight: "font-bold", lineHeight: 21 });
    }
    expect(resolve("ghost", { tone: "muted" }).label.color).toBe("rgba(0,0,0,0.70)");
  });

  it("draws warning as the kit Destructive at the normal size (ConfirmSheet adds its own 56): white, #E6E6E6 edge, #D92D20 Bold label, never filled red", () => {
    const { container, label } = resolve("warning");
    expect(resolve("warning", { size: "compact" }).container.minHeight).toBe(44);
    expect(container.height).toBeUndefined();
    expect(container).toMatchObject({
      minHeight: 52,
      borderRadius: 12,
      backgroundColor: "#FFFFFF",
      borderWidth: 1,
      borderColor: "#E6E6E6",
    });
    expect(label).toMatchObject({ color: "#D92D20", fontWeight: "font-bold", lineHeight: 21 });
  });

  it("keeps the box of a disabled non-primary and dims only its label", () => {
    for (const [variant, tone] of [["outline", undefined], ["outline", "tonal"], ["warning", undefined], ["ghost", "muted"]] as const) {
      const live = resolve(variant, { tone });
      const dead = resolve(variant, { tone, blocked: true });
      expect(dead.container).toEqual(live.container);
      expect(dead.label.color).toBe("rgba(0,0,0,0.60)");
    }
  });

  it("dims a disabled Primary's label in dark, where white on #292929 reads as live", () => {
    const { container, label } = resolveButtonStyle(
      { variant: "primary", size: "default", blocked: true },
      darkColors,
      true
    );
    expect(container.backgroundColor).toBe(darkColors.brandPanelLine);
    expect(label.color).toBe(darkColors.textDim);
  });

  it("resolves dark from the dark tokens and drops the ring", () => {
    const { container, label } = resolveButtonStyle(
      { variant: "outline", size: "default", blocked: false },
      darkColors,
      true
    );
    expect(container.backgroundColor).toBe(darkColors.surface);
    expect(container.shadowOpacity).toBe(0);
    expect(label.color).toBe(darkColors.brandText);
  });
});
