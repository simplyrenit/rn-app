import { describe, expect, it, jest } from "@jest/globals";
import { lightColors } from "@/lib/design-tokens";

jest.mock("@/lib/theme", () => ({ useTheme: () => ({ color: {}, isDark: false }) }));

// eslint-disable-next-line import/first
import { statusPillColors } from "../core/status-pill";

describe("StatusPill on the 2.1 kit (ENG-426)", () => {
  it("draws each tone in the kit's text/bg pair (figma/00 2073:14380)", () => {
    expect(statusPillColors("neutral", lightColors)).toEqual({ fg: "rgba(0,0,0,0.70)", bg: "#F2F2F2" });
    expect(statusPillColors("success", lightColors)).toEqual({ fg: "#067647", bg: "#ECFDF3" });
    expect(statusPillColors("warning", lightColors)).toEqual({ fg: "#B54708", bg: "#FFFAEB" });
    expect(statusPillColors("danger", lightColors)).toEqual({ fg: "#B42318", bg: "#FEF3F2" });
    expect(statusPillColors("info", lightColors)).toEqual({ fg: "#175CD3", bg: "#EFF8FF" });
  });
});
