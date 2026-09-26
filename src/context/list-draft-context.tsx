import { startExtraction as openExtraction, Transport } from "@/backend/list-flow/extraction";
import { uploadPhoto } from "@/backend/list-flow/upload";
import { useGlobalContext } from "@/context/global-context";
import { EventName, track as trackEvent } from "@/lib/events";
import { parseDepositRule } from "@/lib/list-flow/deposit";
import {
  DRAFT_STORAGE_KEY,
  DraftAction,
  MAX_PHOTOS,
  createDraft,
  draftReducer,
  hydrateDraft,
  isDraftWorthResuming,
  serializeDraft,
  uploadedPhotos,
} from "@/lib/list-flow/draft";
import {
  AI_FIELDS,
  AiFieldName,
  CategoryValue,
  ExtractionErrorCode,
  ListingDraft,
  PhotoItem,
  PhotoSource,
} from "@/lib/list-flow/types";
import { uuidv4 } from "@/lib/uuid";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

const SAVE_DEBOUNCE_MS = 500;
/** §7.3: Continue waits this long for uploads still in flight. */
const UPLOAD_WAIT_MS = 10_000;

export interface PickedPhoto {
  uri: string;
  width?: number;
  height?: number;
  source: PhotoSource;
}

export interface ChecklistRow {
  field: AiFieldName;
  status: "filled" | "blank";
}

/**
 * The extraction run in flight, or the last one. Runtime only: it is not part
 * of the draft and is never persisted — a resumed draft has no stream.
 */
export interface RunState {
  status: "idle" | "running" | "done" | "failed" | "rate_limited";
  runNumber: number;
  startedAt: number;
  transport: Transport;
  /** One row per field, in the order the fields arrived. */
  checklist: ChecklistRow[];
  code?: ExtractionErrorCode;
  runId?: string;
  /** Number of photos sent; the Reading screen's "photo n of N". */
  photoCount: number;
}

const IDLE_RUN: RunState = {
  status: "idle",
  runNumber: 0,
  startedAt: 0,
  transport: "sse",
  checklist: [],
  photoCount: 0,
};

interface ListDraftContextValue {
  draft: ListingDraft | null;
  /** True once storage has been read, so "is there a draft?" has an answer. */
  hydrated: boolean;
  /** A draft left from an earlier session or visit, if one is worth offering. */
  resumable: ListingDraft | null;
  run: RunState;
  dispatch: (action: DraftAction) => void;
  startFresh: () => ListingDraft;
  resume: () => void;
  discard: () => void;
  /** After a successful submit: forget the draft without a "discarded" event. */
  clearSubmitted: () => void;
  addPhotos: (photos: PickedPhoto[]) => void;
  replacePhoto: (index: number, photo: PickedPhoto) => void;
  retryPhoto: (id: string) => void;
  removePhoto: (id: string) => void;
  waitForUploads: (timeoutMs?: number) => Promise<void>;
  startExtraction: (options?: { categoryHint?: CategoryValue | null }) => void;
  cancelExtraction: () => void;
  /** `track()` with this draft's attempt id attached. */
  track: (name: EventName, props?: Record<string, unknown>) => void;
}

const ListDraftContext = createContext<ListDraftContextValue | undefined>(undefined);

export const ListDraftProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useGlobalContext();
  const [draft, rawDispatch] = useReducer(draftReducer, null);
  const [hydrated, setHydrated] = useState(false);
  const [stored, setStored] = useState<ListingDraft | null>(null);
  const [run, setRun] = useState<RunState>(IDLE_RUN);

  // Async work (uploads, the stream) outlives the render that started it, so
  // it reads the draft through a ref rather than a stale closure.
  const draftRef = useRef<ListingDraft | null>(null);
  draftRef.current = draft;
  const runHandle = useRef<{ cancel: () => void } | null>(null);
  const savedAttempts = useRef(new Set<string>());

  const dispatch = useCallback((action: DraftAction) => {
    // Keep the ref current between renders too: a burst of stream events can
    // arrive before React re-renders, and each one must see the last.
    draftRef.current = draftReducer(draftRef.current, action);
    rawDispatch(action);
  }, []);

  const trackForDraft = useCallback((name: EventName, props: Record<string, unknown> = {}) => {
    trackEvent(name, props, draftRef.current?.attemptId ?? null);
  }, []);

  // ---- Storage --------------------------------------------------------------

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(DRAFT_STORAGE_KEY)
      .then((raw) => {
        if (!active) return;
        const parsed = hydrateDraft(raw, Date.now());
        // Expired or unreadable: gone for good (§7.2, 14 days).
        if (raw && !parsed) void AsyncStorage.removeItem(DRAFT_STORAGE_KEY).catch(() => {});
        setStored(parsed && isDraftWorthResuming(parsed) ? parsed : null);
      })
      .catch(() => {})
      .finally(() => active && setHydrated(true));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!draft) return;
    const timer = setTimeout(() => {
      // Emptied back to nothing (every photo removed, every field cleared):
      // there is nothing left to offer back, so do not keep an older copy.
      if (!isDraftWorthResuming(draft)) {
        void AsyncStorage.removeItem(DRAFT_STORAGE_KEY).catch(() => {});
        return;
      }
      AsyncStorage.setItem(DRAFT_STORAGE_KEY, serializeDraft(draft))
        .then(() => {
          if (!savedAttempts.current.has(draft.attemptId)) {
            savedAttempts.current.add(draft.attemptId);
            trackEvent("draft_saved", {}, draft.attemptId);
          }
        })
        .catch(() => {});
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft]);

  const forget = useCallback(() => {
    runHandle.current?.cancel();
    runHandle.current = null;
    setRun(IDLE_RUN);
    setStored(null);
    dispatch({ type: "reset", draft: null });
    void AsyncStorage.removeItem(DRAFT_STORAGE_KEY).catch(() => {});
  }, [dispatch]);

  // A draft belongs to whoever was signed in; the next account must not see it.
  useEffect(() => {
    if (isAuthenticated === false && (draftRef.current || stored)) forget();
  }, [isAuthenticated, forget, stored]);

  // ---- Lifecycle ------------------------------------------------------------

  const startFresh = useCallback(() => {
    runHandle.current?.cancel();
    runHandle.current = null;
    setRun(IDLE_RUN);
    const fresh = createDraft(uuidv4(), Date.now());
    dispatch({ type: "reset", draft: fresh });
    return fresh;
  }, [dispatch]);

  const resume = useCallback(() => {
    const candidate = draftRef.current ?? stored;
    if (!candidate) return;
    dispatch({ type: "reset", draft: candidate });
    setStored(null);
    trackEvent("draft_resumed", {}, candidate.attemptId);
  }, [dispatch, stored]);

  const discard = useCallback(() => {
    const attemptId = draftRef.current?.attemptId ?? stored?.attemptId ?? null;
    forget();
    trackEvent("draft_discarded", {}, attemptId);
  }, [forget, stored]);

  // ---- Photos ---------------------------------------------------------------

  const upload = useCallback(
    async (photo: PhotoItem, size: { width?: number; height?: number }, attempt = 0) => {
      try {
        const remoteUrl = await uploadPhoto(photo.localUri, size);
        const current = draftRef.current;
        const index = current?.photos.findIndex((p) => p.id === photo.id) ?? -1;
        // Removed or discarded while uploading: nothing to update.
        if (index < 0) return;
        dispatch({ type: "updatePhoto", id: photo.id, patch: { status: "done", remoteUrl } });
        trackForDraft("photo_added", { source: photo.source, index });
      } catch {
        if (!draftRef.current?.photos.some((p) => p.id === photo.id)) return;
        // One automatic retry (§7.3), then the tile offers a tap to retry.
        if (attempt === 0) {
          dispatch({ type: "updatePhoto", id: photo.id, patch: { retries: 1 } });
          await upload(photo, size, 1);
          return;
        }
        dispatch({ type: "updatePhoto", id: photo.id, patch: { status: "failed" } });
      }
    },
    [dispatch, trackForDraft]
  );

  const sizes = useRef(new Map<string, { width?: number; height?: number }>());

  const addPhotos = useCallback(
    (picked: PickedPhoto[]) => {
      const current = draftRef.current;
      if (!current) return;
      const room = MAX_PHOTOS - current.photos.length;
      picked.slice(0, Math.max(0, room)).forEach((asset) => {
        const photo: PhotoItem = {
          id: uuidv4(),
          localUri: asset.uri,
          source: asset.source,
          status: "uploading",
        };
        const size = { width: asset.width, height: asset.height };
        sizes.current.set(photo.id, size);
        dispatch({ type: "addPhoto", photo });
        void upload(photo, size);
      });
    },
    [dispatch, upload]
  );

  const replacePhoto = useCallback(
    (index: number, asset: PickedPhoto) => {
      const photo: PhotoItem = {
        id: uuidv4(),
        localUri: asset.uri,
        source: asset.source,
        status: "uploading",
      };
      const size = { width: asset.width, height: asset.height };
      sizes.current.set(photo.id, size);
      dispatch({ type: "replacePhoto", index, photo });
      void upload(photo, size);
    },
    [dispatch, upload]
  );

  const retryPhoto = useCallback(
    (id: string) => {
      const photo = draftRef.current?.photos.find((p) => p.id === id);
      if (!photo) return;
      dispatch({ type: "updatePhoto", id, patch: { status: "uploading", retries: 0 } });
      void upload(photo, sizes.current.get(id) ?? {}, 1);
    },
    [dispatch, upload]
  );

  const removePhoto = useCallback(
    (id: string) => {
      const index = draftRef.current?.photos.findIndex((p) => p.id === id) ?? -1;
      if (index < 0) return;
      dispatch({ type: "removePhoto", id });
      sizes.current.delete(id);
      trackForDraft("photo_removed", { index });
    },
    [dispatch, trackForDraft]
  );

  const waitForUploads = useCallback((timeoutMs = UPLOAD_WAIT_MS) => {
    return new Promise<void>((resolve) => {
      const started = Date.now();
      const check = () => {
        const pending = draftRef.current?.photos.some((p) => p.status === "uploading");
        if (!pending || Date.now() - started >= timeoutMs) resolve();
        else setTimeout(check, 200);
      };
      check();
    });
  }, []);

  // ---- Extraction -----------------------------------------------------------

  const cancelExtraction = useCallback(() => {
    runHandle.current?.cancel();
    runHandle.current = null;
    setRun((r) => (r.status === "running" ? { ...r, status: "failed", code: "network" } : r));
  }, []);

  const startExtraction = useCallback(
    ({ categoryHint = null }: { categoryHint?: CategoryValue | null } = {}) => {
      const current = draftRef.current;
      if (!current) return;
      runHandle.current?.cancel();

      const sent = uploadedPhotos(current);
      const startedAt = Date.now();
      let firstFieldSeen = false;
      const runNumber = current.extractionRuns + 1;

      dispatch({ type: "runStarted" });
      setRun({
        status: "running",
        runNumber,
        startedAt,
        transport: "sse",
        checklist: [],
        photoCount: sent.length,
      });
      trackForDraft("extraction_started", { run_number: runNumber, photos: sent.length });

      // Warning photo numbers count the photos sent, which can skip a failed
      // upload; translate them back to positions in the draft.
      const toDraftPhoto = (n?: number) => {
        if (!n) return n;
        const sentPhoto = sent[n - 1];
        const index = sentPhoto ? draftRef.current?.photos.findIndex((p) => p.id === sentPhoto.id) : -1;
        return index !== undefined && index >= 0 ? index + 1 : n;
      };

      runHandle.current = openExtraction(
        {
          attempt_id: current.attemptId,
          image_urls: sent.map((p) => p.remoteUrl as string),
          photo_sources: sent.map((p) => p.source),
          category_hint: categoryHint,
        },
        {
          onRun: (event) => setRun((r) => ({ ...r, runId: event.run_id })),
          onField: (event) => {
            if (!(AI_FIELDS as readonly string[]).includes(event.field)) return;
            if (!firstFieldSeen) {
              firstFieldSeen = true;
              trackForDraft("extraction_first_field", { ms: Date.now() - startedAt });
            }
            dispatch({ type: "mergeAi", event });
            const row: ChecklistRow = { field: event.field as AiFieldName, status: event.status };
            setRun((r) => {
              const at = r.checklist.findIndex((c) => c.field === row.field);
              const checklist = r.checklist.slice();
              if (at >= 0) checklist[at] = row;
              else checklist.push(row);
              return { ...r, checklist };
            });
          },
          onWarning: (event) =>
            dispatch({
              type: "addWarning",
              warning: { ...event, photo: toDraftPhoto(event.photo) },
            }),
          onDone: (done, transport) => {
            const rule = parseDepositRule(done.deposit_rule ?? null);
            if (rule) dispatch({ type: "setDepositRule", rule });
            setRun((r) => ({ ...r, status: "done", transport, runId: done.run_id || r.runId }));
            trackForDraft("extraction_completed", {
              ms: Date.now() - startedAt,
              filled: done.filled?.length ?? 0,
              blank: done.blank?.length ?? 0,
              transport,
            });
            runHandle.current = null;
          },
          onFallback: (code) => {
            setRun((r) => ({ ...r, transport: "json" }));
            trackForDraft("extraction_failed", { code, transport: "sse" });
          },
          onRateLimited: (code) => {
            setRun((r) => ({ ...r, status: "rate_limited", code }));
            // Out of attempts for today: Review explains its blanks. Out of
            // runs on this attempt: Review keeps what it has, no note.
            if (code === "quota_attempts") dispatch({ type: "setReviewNote", note: "quota" });
            trackForDraft("extraction_rate_limited", { code });
            runHandle.current = null;
          },
          onFailed: (code, transport) => {
            setRun((r) => ({ ...r, status: "failed", code, transport }));
            dispatch({ type: "setReviewNote", note: "failed" });
            trackForDraft("extraction_failed", { code, transport });
            runHandle.current = null;
          },
        }
      );
    },
    [dispatch, trackForDraft]
  );

  const clearSubmitted = useCallback(() => {
    forget();
  }, [forget]);

  useEffect(() => () => runHandle.current?.cancel(), []);

  const resumable = useMemo(() => {
    if (draft && isDraftWorthResuming(draft)) return draft;
    return stored;
  }, [draft, stored]);

  const value: ListDraftContextValue = {
    draft,
    hydrated,
    resumable,
    run,
    dispatch,
    startFresh,
    resume,
    discard,
    clearSubmitted,
    addPhotos,
    replacePhoto,
    retryPhoto,
    removePhoto,
    waitForUploads,
    startExtraction,
    cancelExtraction,
    track: trackForDraft,
  };

  return <ListDraftContext.Provider value={value}>{children}</ListDraftContext.Provider>;
};

export function useListDraft() {
  const context = useContext(ListDraftContext);
  if (!context) throw new Error("useListDraft must be used within a ListDraftProvider");
  return context;
}
