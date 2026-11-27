import { describe, expect, it, jest } from "@jest/globals";
import { createDraft } from "@/lib/list-flow/draft";
import { fixtures } from "@/dev/design-fixtures/10";
import { seededFlow } from "@/dev/list-flow-seed";

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}));

// J1 (ENG-435): the listing-flow seed is inert, and every section-10 fixture keeps the guards on.
describe("list-flow seed", () => {
  const draft = createDraft("design-attempt", 0);

  it("serves the seed's draft and run and makes every action a no-op", async () => {
    const flow = seededFlow({ draft, run: { status: "running", photoCount: 2 } });
    expect(flow.draft).toBe(draft);
    expect(flow.resumable).toBeNull();
    expect(flow.hydrated).toBe(true);
    expect(flow.run).toMatchObject({ status: "running", photoCount: 2, checklist: [], runNumber: 0 });
    expect(flow.startFresh()).toBe(draft);
    for (const action of [
      flow.dispatch,
      flow.resume,
      flow.discard,
      flow.clearSubmitted,
      flow.addPhotos,
      flow.replacePhoto,
      flow.retryPhoto,
      flow.removePhoto,
      flow.startExtraction,
      flow.cancelExtraction,
      flow.ensureSpecs,
      flow.track,
    ] as ((...args: any[]) => unknown)[]) {
      expect(action({} as never)).toBeUndefined();
    }
    await expect(flow.waitForUploads(10)).resolves.toBeUndefined();
  });

  it("offers the seed's draft as the resumable one", () => {
    const flow = seededFlow({ draft, resumable: true });
    expect(flow.draft).toBeNull();
    expect(flow.resumable).toBe(draft);
  });

  it("puts a design seed on every List* and DraftPhotos fixture, and a design_ user on every session", () => {
    const entries = Object.entries(fixtures);
    expect(entries.length).toBeGreaterThan(0);
    for (const [id, fixture] of entries) {
      if (fixture.route.startsWith("List") || fixture.route === "DraftPhotos") {
        expect([id, (fixture.params as { design?: unknown } | undefined)?.design]).not.toEqual([id, undefined]);
      }
      if (fixture.session) expect([id, fixture.session.user.username.startsWith("design_")]).toEqual([id, true]);
    }
  });
});
