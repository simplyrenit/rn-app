/**
 * How far a native switch reaches past the frame React Native gives it. The layout assumes the classic iPhone switch, 51 pt
 * wide; on iOS 26 the switch is 63 pt, so it sticks out 12 pt past the right edge of its row (test run D-11). The row is
 * given that much room on the right, and only where the switch is the wider one.
 */
export const IOS_26_SWITCH_OVERHANG = 12;

export function switchInset(os: string, version: string | number | null | undefined): number {
  if (os !== "ios") return 0;
  const major = parseInt(String(version ?? ""), 10);
  return Number.isFinite(major) && major >= 26 ? IOS_26_SWITCH_OVERHANG : 0;
}
