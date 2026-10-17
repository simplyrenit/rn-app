import { describe, expect, it } from "@jest/globals";
import { customerDeadlineNotice, customerPushNotice, quietBody, ringCaption, ringNotice, ringPermission, ringsHere } from "../ring-permission";

describe("ringPermission", () => {
  it("a phone that was allowed notifications can ring", () => {
    expect(ringPermission({ status: "granted" }, true)).toBe("granted");
    expect(ringPermission({ status: "granted", canAskAgain: false }, true)).toBe("granted");
  });

  it("a phone that was never asked, or refused where the system will still ask, is asked", () => {
    expect(ringPermission({ status: "undetermined", canAskAgain: true }, true)).toBe("ask");
    expect(ringPermission({ status: "undetermined" }, true)).toBe("ask");
    expect(ringPermission({ status: "denied", canAskAgain: true }, true)).toBe("ask");
    expect(ringPermission({ status: "denied" }, true)).toBe("ask");
  });

  it("a refusal the system will not ask about again can only be changed in the settings", () => {
    expect(ringPermission({ status: "denied", canAskAgain: false }, true)).toBe("settings");
  });

  it("says nothing for a phone that cannot get pushes, and waits for the system's answer", () => {
    expect(ringPermission({ status: "denied", canAskAgain: false }, false)).toBe("unavailable");
    expect(ringPermission(null, true)).toBeNull();
  });
});

describe("ringsHere", () => {
  it("is true only when this phone will ring, and unknown when it does not apply", () => {
    expect(ringsHere("granted")).toBe(true);
    expect(ringsHere("ask")).toBe(false);
    expect(ringsHere("settings")).toBe(false);
    expect(ringsHere("unavailable")).toBeNull();
    expect(ringsHere(null)).toBeNull();
  });
});

describe("ringNotice", () => {
  it("asks with a reason when the system will still ask, and points to the settings when it will not", () => {
    expect(ringNotice("ask")).toMatchObject({ action: "turn_on", label: "Turn on notifications" });
    expect(ringNotice("ask")?.body).toMatch(/this phone will not ring/);
    expect(ringNotice("settings")).toMatchObject({ action: "open_settings", label: "Open settings", title: "This phone will not ring" });
  });

  it("warns of nothing when the phone can ring, or the state is not known", () => {
    expect(ringNotice("granted")).toBeNull();
    expect(ringNotice("unavailable")).toBeNull();
    expect(ringNotice(null)).toBeNull();
  });
});

describe("the Open switch does not let an owner believe the phone rings when it cannot", () => {
  it("says so under an open switch on a phone that will not ring", () => {
    expect(ringCaption("Open until 8:00 pm", true, "settings")).toBe("Open until 8:00 pm · this phone won't ring");
    expect(ringCaption("Open until 8:00 pm", true, "ask")).toBe("Open until 8:00 pm · this phone won't ring");
  });

  it("leaves the line alone when the phone rings, when it does not apply, or when the shop is closed", () => {
    expect(ringCaption("Open until 8:00 pm", true, "granted")).toBe("Open until 8:00 pm");
    expect(ringCaption("Open until 8:00 pm", true, null)).toBe("Open until 8:00 pm");
    expect(ringCaption("Closed by you", false, "settings")).toBe("Closed by you");
  });

  it("a quiet Today only promises a ring this phone can give", () => {
    expect(quietBody("granted")).toMatch(/New requests ring this phone/);
    expect(quietBody(null)).toMatch(/New requests ring this phone/);
    expect(quietBody("settings")).not.toMatch(/ring this phone/);
    expect(quietBody("ask")).not.toMatch(/ring this phone/);
  });
});

describe("customerPushNotice", () => {
  it("says so, in a customer's words, when this phone cannot show the owner's answer", () => {
    for (const state of ["ask", "settings"] as const) {
      expect(customerPushNotice(state)).toBe(
        "Notifications are off, so we can't tell you when the owner answers. Turn them on in Settings.",
      );
      expect(customerDeadlineNotice(state)).toMatch(/remind you before this runs out/);
    }
  });

  it("says nothing when the push will arrive, or when that is not known or does not apply", () => {
    for (const state of ["granted", "unavailable", null] as const) {
      expect(customerPushNotice(state)).toBeNull();
      expect(customerDeadlineNotice(state)).toBeNull();
    }
  });
});
