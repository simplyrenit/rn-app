/**
 * The listing-flow design seed (ENG-435, dev builds only). A design fixture passes `params.design` to a `List*`
 * screen; the screen then reads `seededFlow(design)` in place of `useListDraft()`, so the frame's draft, run and
 * sheet show without a real draft. Every action is a no-op: no dispatch, no upload, no extraction, no AsyncStorage.
 *
 * Screens reach it only through a `__DEV__` require, so release bundles drop it.
 */
import type { RunState, useListDraft } from "@/context/list-draft-context";
import type { ListingDraft } from "@/lib/list-flow/types";

// Exported so a release bundle that contained this module would show it (README, release safety).
export const RENIT_DEV_LIST_FLOW_SEED_MARKER = "RENIT_DEV_LIST_FLOW_SEED_MARKER";

type Flow = ReturnType<typeof useListDraft>;

export type ListFlowDesign = {
  /** The draft as the frame shows it: photos, fields with source, warnings, specs. */
  draft: ListingDraft;
  /** Merged over an idle run: status, checklist, photoCount, code. */
  run?: Partial<RunState>;
  /** ListAddPhotos only: offer `draft` as the resumable one; the live draft is then null. */
  resumable?: boolean;
  /** Opens a sheet on mount: the add-photo sheet, the category sheet (or a parent's child list), a spec's sheet. */
  sheet?: "add-photo" | "category" | { category: string } | { spec: string };
};

const IDLE_RUN: RunState = { status: "idle", runNumber: 0, startedAt: 0, transport: "sse", checklist: [], photoCount: 0 };
const noop = () => {};

/** The context value a seeded screen reads: the seed's draft, run and resumable, every action a no-op. */
export function seededFlow(design: ListFlowDesign): Flow {
  return {
    draft: design.resumable ? null : design.draft,
    hydrated: true,
    resumable: design.resumable ? design.draft : null,
    run: { ...IDLE_RUN, ...design.run },
    dispatch: noop,
    startFresh: () => design.draft,
    resume: noop,
    discard: noop,
    clearSubmitted: noop,
    addPhotos: noop,
    replacePhoto: noop,
    retryPhoto: noop,
    removePhoto: noop,
    waitForUploads: () => Promise.resolve(),
    startExtraction: noop,
    cancelExtraction: noop,
    ensureSpecs: noop,
    track: noop,
  };
}
