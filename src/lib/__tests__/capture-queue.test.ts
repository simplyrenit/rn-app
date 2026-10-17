import { describe, expect, it, jest } from "@jest/globals";
import { AxiosError } from "axios";
import { Capture, CaptureDraft, ShotList, addShot, codeConfirmed, reopenForMissing, seal, setVideo, startDraft, tick } from "../capture";
import { CaptureQueueDeps, FileGone, createCaptureQueue } from "../capture-queue";

/** An axios error with an answer, the way the server's errors come. */
function answer(status: number, code: string, message: string | null = null, details: unknown = null): AxiosError {
  return new AxiosError("failed", undefined, undefined, undefined, {
    status,
    data: { error: { code, message, details } },
  } as never);
}

const list: ShotList = {
  shots: [
    { key: "front", label: "Front", hint: "" },
    { key: "back", label: "Back", hint: "" },
  ],
  video_hint: "",
  included_items: ["Power cable"],
  id_match_required: false,
};

const complete = { complete: true, missing: [] } as unknown as Capture;

function setup(over: Partial<CaptureQueueDeps> = {}) {
  const saved: CaptureDraft[][] = [];
  const deps: CaptureQueueDeps = {
    upload: jest.fn(async (uri: string) => `https://bucket.test/uploads/${uri.split("/").pop()}`),
    send: jest.fn(async () => complete),
    load: jest.fn(async () => [] as CaptureDraft[]),
    save: jest.fn(async (_account: string, drafts: CaptureDraft[]) => {
      saved.push(drafts);
    }),
    discard: jest.fn(async () => undefined),
    ...over,
  };
  return { queue: createCaptureQueue(deps), deps, saved };
}

const draft = (moment: "handover" | "return" = "handover") =>
  startDraft({ number: "RN-24831", moment, side: "customer", list });
const ID = "RN-24831:handover:customer";
const photo = (name: string) => ({ uri: `file:///captures/${name}.jpg`, taken_at: "2026-10-24T04:41:00Z" });
const video = { uri: "file:///captures/video.mp4", taken_at: "2026-10-24T04:43:00Z", seconds: 18 };

/** Takes every shot and the video, ticks, and finishes. */
function record(queue: ReturnType<typeof createCaptureQueue>, id = ID) {
  queue.update(id, (d) => addShot(d, "front", photo("front")));
  queue.update(id, (d) => addShot(d, "back", photo("back")));
  queue.update(id, (d) => setVideo(d, video));
  queue.update(id, (d) => seal(tick(d, "Power cable")));
}

describe("the capture queue", () => {
  it("uploads each file as it is taken, then sends the record once, when the person has finished", async () => {
    const order: string[] = [];
    const { queue, deps } = setup({
      upload: jest.fn(async (uri: string, kind: "photo" | "video") => {
        order.push(`${kind} ${uri.split("/").pop()}`);
        return `https://bucket.test/${uri.split("/").pop()}`;
      }),
      send: jest.fn(async () => {
        order.push("send");
        return complete;
      }),
    });
    await queue.init("asha");
    queue.start(draft());
    queue.update(ID, (d) => addShot(d, "front", photo("front")));
    await queue.idle();
    // The photo is already up; nothing is sent while the walk goes on.
    expect(order).toEqual(["photo front.jpg"]);
    expect(deps.send).not.toHaveBeenCalled();

    queue.update(ID, (d) => addShot(d, "back", photo("back")));
    queue.update(ID, (d) => setVideo(d, video));
    queue.update(ID, (d) => seal(tick(d, "Power cable")));
    await queue.idle();
    expect(order).toEqual(["photo front.jpg", "photo back.jpg", "video video.mp4", "send"]);
    expect(deps.send).toHaveBeenCalledTimes(1);
    const [sent, body] = (deps.send as jest.Mock).mock.calls[0] as [CaptureDraft, { shots: { key: string; url: string }[]; video: { url: string }; checklist: unknown }];
    expect(sent.id).toBe(ID);
    expect(body.shots.map((s) => s.key)).toEqual(["front", "back"]);
    expect(body.video.url).toBe("https://bucket.test/video.mp4");
    expect(body.checklist).toEqual([{ item: "Power cable", ticked: true }]);
    expect(queue.getDrafts()[0].done).toBe(true);
    // The copies on the phone are cleared once the server has them.
    expect(deps.discard).toHaveBeenCalledWith([
      "file:///captures/front.jpg",
      "file:///captures/back.jpg",
      "file:///captures/video.mp4",
    ]);
  });

  it("a black photo the server refuses leaves the record with no tick, and only that shot is asked for again", async () => {
    const words = "Too dark to see the item. Take it again in good light.";
    const send = jest
      .fn<CaptureQueueDeps["send"]>()
      .mockRejectedValueOnce(answer(400, "photo_too_dark", words, { keys: ["back"] }))
      .mockResolvedValue(complete);
    const { queue, deps } = setup({ send });
    await queue.init("asha");
    queue.start(draft());
    record(queue);
    await queue.idle();

    const refused = queue.getDrafts()[0];
    expect(send).toHaveBeenCalledTimes(1);
    expect(refused.shots.back).toBeUndefined();
    expect(refused.shots.front?.url).not.toBeNull();
    expect(refused).toMatchObject({ sealed: false, done: false, error: { text: words, retry: false } });
    expect(deps.discard).toHaveBeenCalledWith(["file:///captures/back.jpg"]);
    // Nothing is sent again by itself.
    expect(queue.hasWork()).toBe(false);

    queue.update(ID, (d) => addShot(d, "back", photo("back-again")));
    queue.update(ID, (d) => seal(d));
    await queue.idle();
    expect(send).toHaveBeenCalledTimes(2);
    expect(queue.getDrafts()[0]).toMatchObject({ done: true, error: null });
  });

  it("with no connection nothing is lost: the files wait, and go up on the next try", async () => {
    let online = false;
    const { queue, deps } = setup({
      upload: jest.fn(async (uri: string) => {
        if (!online) throw new Error("Network request failed");
        return `https://bucket.test/${uri.split("/").pop()}`;
      }),
    });
    await queue.init("asha");
    queue.start(draft());
    record(queue);
    await queue.idle();
    const waiting = queue.getDrafts()[0];
    expect(waiting.done).toBe(false);
    expect(waiting.error).toMatchObject({ retry: true });
    expect(waiting.sealed).toBe(true);
    expect(deps.send).not.toHaveBeenCalled();
    expect(queue.hasWork()).toBe(true);

    online = true;
    queue.kick();
    await queue.idle();
    expect(queue.getDrafts()[0]).toMatchObject({ done: true, error: null });
    expect(deps.send).toHaveBeenCalledTimes(1);
    expect(queue.hasWork()).toBe(false);
  });

  it("a connection lost in the middle keeps what is already up and carries on from there", async () => {
    let lost = true;
    const { queue, deps } = setup({
      upload: jest.fn(async (uri: string) => {
        if (lost && !uri.endsWith("front.jpg")) throw new Error("Network request failed");
        return `https://bucket.test/${uri.split("/").pop()}`;
      }),
    });
    await queue.init("asha");
    queue.start(draft());
    record(queue);
    await queue.idle();
    expect(queue.getDrafts()[0].shots.front.url).toBe("https://bucket.test/front.jpg");
    expect(queue.getDrafts()[0].shots.back.url).toBeNull();
    expect(deps.send).not.toHaveBeenCalled();

    lost = false;
    queue.kick();
    await queue.idle();
    expect(queue.getDrafts()[0].done).toBe(true);
    // The photo that was up is not sent again.
    const names = (deps.upload as jest.Mock).mock.calls.map((c) => (c[0] as string).split("/").pop());
    expect(names.filter((n) => n === "front.jpg")).toHaveLength(1);
    expect(names.slice(-2)).toEqual(["back.jpg", "video.mp4"]);
  });

  it("survives a closed app: the kept record is taken back and finished", async () => {
    const first = setup({ upload: jest.fn(async () => Promise.reject(new Error("offline"))) });
    await first.queue.init("asha");
    first.queue.start(draft());
    record(first.queue);
    await first.queue.idle();
    const kept = first.saved[first.saved.length - 1];
    expect(kept).toHaveLength(1);
    expect(kept[0].sealed).toBe(true);

    // The app starts again.
    const second = setup({ load: jest.fn(async () => kept) });
    await second.queue.init("asha");
    await second.queue.idle();
    expect(second.deps.load).toHaveBeenCalledWith("asha");
    expect(second.queue.getDrafts()[0].done).toBe(true);
    expect(second.deps.send).toHaveBeenCalledTimes(1);
    // Nothing is left to keep.
    expect(second.saved[second.saved.length - 1]).toEqual([]);
  });

  it("a lost answer to the send: the next try hears `capture_locked` and is done", async () => {
    let lost = true;
    const { queue, deps } = setup({
      send: jest.fn(async () => {
        // The first send reached the server, but its answer never came back.
        if (lost) throw new AxiosError("Network Error");
        throw answer(409, "capture_locked");
      }),
    });
    await queue.init("asha");
    queue.start(draft());
    record(queue);
    await queue.idle();
    expect(queue.getDrafts()[0]).toMatchObject({ done: false, error: { retry: true } });
    lost = false;
    queue.kick();
    await queue.idle();
    expect(queue.getDrafts()[0]).toMatchObject({ done: true, error: null });
  });

  it("a send the server refuses is not repeated by the timer, only by the person", async () => {
    const send = jest.fn(async () => {
      throw answer(403, "forbidden");
    });
    const { queue } = setup({ send: send as unknown as CaptureQueueDeps["send"] });
    await queue.init("asha");
    queue.start(draft());
    record(queue);
    await queue.idle();
    expect(queue.getDrafts()[0].error).toMatchObject({ retry: false });
    queue.kick();
    queue.kick();
    await queue.idle();
    expect(send).toHaveBeenCalledTimes(1);
    expect(queue.hasWork()).toBe(false);
    queue.retry(ID);
    await queue.idle();
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("a record the server refuses as not taken is stopped and kept with its files: one answer deletes nothing (review r1 #6)", async () => {
    const send = jest.fn(async () => {
      throw answer(409, "stage_not_allowed");
    });
    const { queue, deps, saved } = setup({
      send: send as unknown as CaptureQueueDeps["send"],
      now: () => Date.parse("2026-10-24T05:00:00Z"),
    });
    await queue.init("asha");
    queue.start(draft());
    record(queue);
    await queue.idle();
    const kept = queue.getDrafts()[0];
    expect(kept).toMatchObject({ done: false, sealed: true, refusedAt: "2026-10-24T05:00:00.000Z", error: { retry: false } });
    expect(kept.shots.front.url).toBeTruthy();
    expect(deps.discard).not.toHaveBeenCalled();
    // Still on the phone after a restart, and not sent again by the timer.
    expect(saved[saved.length - 1]).toHaveLength(1);
    queue.kick();
    await queue.idle();
    expect(send).toHaveBeenCalledTimes(1);
    // The person's Try again sends it once more; the first refusal's time stays.
    queue.retry(ID);
    await queue.idle();
    expect(send).toHaveBeenCalledTimes(2);
    expect(queue.getDrafts()[0].refusedAt).toBe("2026-10-24T05:00:00.000Z");
  });

  it("a record refused more than a week ago is let go of at the next start", async () => {
    const refused = (at: string): CaptureDraft => ({
      ...seal(setVideo(addShot(addShot(draft(), "front", photo("front")), "back", photo("back")), video)),
      refusedAt: at,
      error: { text: "Renit did not take this record.", retry: false },
    });
    const week = setup({
      load: jest.fn(async () => [refused("2026-10-10T05:00:00Z")]),
      now: () => Date.parse("2026-10-24T05:00:00Z"),
    });
    await week.queue.init("asha");
    expect(week.queue.getDrafts()).toEqual([]);
    expect(week.deps.discard).toHaveBeenCalledWith([
      "file:///captures/front.jpg",
      "file:///captures/back.jpg",
      "file:///captures/video.mp4",
    ]);
    const days = setup({
      load: jest.fn(async () => [refused("2026-10-22T05:00:00Z")]),
      now: () => Date.parse("2026-10-24T05:00:00Z"),
    });
    await days.queue.init("asha");
    expect(days.queue.getDrafts()).toHaveLength(1);
    expect(days.deps.discard).not.toHaveBeenCalled();
  });

  it("a 401 on the send is tried again by itself, like a lost connection (review r1 #7)", async () => {
    let expired = true;
    const { queue, deps } = setup({
      send: jest.fn(async () => {
        if (expired) throw answer(401, "not_authenticated");
        return complete;
      }),
    });
    await queue.init("asha");
    queue.start(draft());
    record(queue);
    await queue.idle();
    expect(queue.getDrafts()[0]).toMatchObject({ done: false, error: { retry: true } });
    expect(queue.hasWork()).toBe(true);
    expired = false;
    // The timer's kick, with nobody tapping anything.
    queue.kick();
    await queue.idle();
    expect(queue.getDrafts()[0]).toMatchObject({ done: true, error: null });
    expect((deps.send as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("a file that leaves a record is deleted then: a shot taken again, and a record let go of (review r1 #8)", async () => {
    const { queue, deps } = setup({ upload: jest.fn(async () => Promise.reject(new Error("offline"))) });
    await queue.init("asha");
    queue.start(draft());
    queue.update(ID, (d) => addShot(d, "front", photo("front")));
    queue.update(ID, (d) => addShot(d, "front", photo("front-2")));
    await queue.idle();
    expect(deps.discard).toHaveBeenCalledWith(["file:///captures/front.jpg"]);
    expect(queue.getDrafts()[0].shots.front.uri).toBe("file:///captures/front-2.jpg");

    // The booking was cancelled in the middle of the walk: the screen that reads it lets the record go.
    (deps.discard as jest.Mock).mockClear();
    queue.release("RN-24831", () => false);
    expect(queue.getDrafts()).toEqual([]);
    expect(deps.discard).toHaveBeenCalledWith(["file:///captures/front-2.jpg"]);
  });

  it("release leaves the records it is told to keep, and other bookings' records", async () => {
    const { queue } = setup({ upload: jest.fn(async () => Promise.reject(new Error("offline"))) });
    await queue.init("asha");
    queue.start(draft());
    queue.start(draft("return"));
    queue.start(startDraft({ number: "RN-30000", moment: "handover", side: "customer", list }));
    queue.release("RN-24831", (d) => d.moment === "handover");
    expect(queue.getDrafts().map((d) => d.id)).toEqual(["RN-24831:handover:customer", "RN-30000:handover:customer"]);
  });

  it("a shot taken again while its first photo was going up is not a failed upload", async () => {
    let release: () => void = () => undefined;
    const { queue } = setup({
      upload: jest.fn(async (uri: string) => {
        if (uri.endsWith("front.jpg")) {
          await new Promise<void>((resolve) => (release = resolve));
          // Its file was cleared when the shot was taken again.
          throw new Error("no such file");
        }
        return `https://bucket.test/${uri.split("/").pop()}`;
      }),
    });
    await queue.init("asha");
    queue.start(draft());
    queue.update(ID, (d) => addShot(d, "front", photo("front")));
    await Promise.resolve();
    queue.update(ID, (d) => addShot(d, "front", photo("front-2")));
    release();
    await queue.idle();
    const d = queue.getDrafts()[0];
    expect(d.error).toBeNull();
    expect(d.shots.front).toMatchObject({ uri: "file:///captures/front-2.jpg", url: "https://bucket.test/front-2.jpg" });
  });

  it("Try again does nothing for a record that still needs a photo: its card opens the capture instead (review r1 #1)", async () => {
    const { queue, deps } = setup({
      upload: jest.fn(async (uri: string) => {
        if (uri.endsWith("back.jpg")) throw new FileGone();
        return `https://bucket.test/${uri.split("/").pop()}`;
      }),
    });
    await queue.init("asha");
    queue.start(draft());
    record(queue);
    await queue.idle();
    const before = queue.getDrafts()[0];
    expect(before).toMatchObject({ sealed: false, error: { retry: false } });
    queue.retry(ID);
    await queue.idle();
    // The reason stays on screen, and nothing was sent.
    expect(queue.getDrafts()[0].error).toEqual(before.error);
    expect(deps.send).not.toHaveBeenCalled();
  });

  it("a file the phone no longer has is asked for again, and the rest still goes up", async () => {
    const { queue, deps } = setup({
      upload: jest.fn(async (uri: string) => {
        if (uri.endsWith("back.jpg")) throw new FileGone();
        return `https://bucket.test/${uri.split("/").pop()}`;
      }),
    });
    await queue.init("asha");
    queue.start(draft());
    record(queue);
    await queue.idle();
    const d = queue.getDrafts()[0];
    expect(d.shots.back).toBeUndefined();
    expect(d.sealed).toBe(false);
    expect(d.error).toMatchObject({ retry: false });
    expect(d.shots.front.url).toBeTruthy();
    expect(d.video?.url).toBeTruthy();
    expect(deps.send).not.toHaveBeenCalled();

    // Taken again and finished: it goes through.
    queue.update(ID, (x) => seal(addShot(x, "back", photo("back-2"))));
    await queue.idle();
    expect(queue.getDrafts()[0].done).toBe(true);
  });

  it("a photo the server did not find is sent again from the kept copy, and nothing is deleted from the phone before the record is complete", async () => {
    let sends = 0;
    const { queue, deps } = setup({
      send: jest.fn(async () => {
        sends += 1;
        return (sends === 1 ? { complete: false, missing: ["back"] } : complete) as unknown as Capture;
      }),
    });
    await queue.init("asha");
    queue.start(draft());
    record(queue);
    await queue.idle();
    const uploads = (deps.upload as jest.Mock).mock.calls.map((c) => c[0]);
    // front, back, video, then back again, from the same file.
    expect(uploads).toEqual([
      "file:///captures/front.jpg",
      "file:///captures/back.jpg",
      "file:///captures/video.mp4",
      "file:///captures/back.jpg",
    ]);
    expect(deps.send).toHaveBeenCalledTimes(2);
    expect((deps.send as jest.Mock).mock.calls[1][1]).toMatchObject({ shots: expect.arrayContaining([expect.objectContaining({ key: "back" })]) });
    expect(queue.getDrafts()[0]).toMatchObject({ done: true, error: null });
    // The files go when the server has the whole record, and not before: the one discard comes after the second send.
    expect(deps.discard).toHaveBeenCalledTimes(1);
    expect((deps.discard as jest.Mock).mock.invocationCallOrder[0]).toBeGreaterThan((deps.send as jest.Mock).mock.invocationCallOrder[1]);
  });

  it("the video the server did not find is sent again from the kept copy too", async () => {
    let sends = 0;
    const { queue, deps } = setup({
      send: jest.fn(async () => {
        sends += 1;
        return (sends === 1 ? { complete: false, missing: ["video"] } : complete) as unknown as Capture;
      }),
    });
    await queue.init("asha");
    queue.start(draft());
    record(queue);
    await queue.idle();
    expect((deps.upload as jest.Mock).mock.calls.filter((c) => c[1] === "video").map((c) => c[0])).toEqual([
      "file:///captures/video.mp4",
      "file:///captures/video.mp4",
    ]);
    expect(queue.getDrafts()[0].done).toBe(true);
    // Nothing was cleared while the video was missing.
    expect((deps.discard as jest.Mock).mock.calls.flat(2)).toEqual(expect.arrayContaining(["file:///captures/video.mp4"]));
    expect((deps.discard as jest.Mock).mock.invocationCallOrder[0]).toBeGreaterThan((deps.send as jest.Mock).mock.invocationCallOrder[1]);
  });

  it("a file the server keeps losing is sent again by itself only twice in a run, then left for the next try, with the copy still on the phone", async () => {
    const { queue, deps } = setup({
      send: jest.fn(async () => ({ complete: false, missing: ["back"] }) as unknown as Capture),
    });
    await queue.init("asha");
    queue.start(draft());
    record(queue);
    await queue.idle();
    // The run ended (no endless loop) and the record is waiting, not stuck: nothing was lost.
    const d = queue.getDrafts()[0];
    expect(d).toMatchObject({ done: false, sealed: true, error: { retry: true } });
    expect(d.shots.back.uri).toBe("file:///captures/back.jpg");
    expect(deps.discard).not.toHaveBeenCalled();
    // The next kick tries again, at most twice, and stops again (and for good after a few kicks: see the next test).
    const before = (deps.send as jest.Mock).mock.calls.length;
    queue.kick();
    await queue.idle();
    const after = (deps.send as jest.Mock).mock.calls.length;
    expect(after).toBeGreaterThan(before);
    expect(after).toBeLessThanOrEqual(before + 2);
  });

  it("a file the server keeps losing across runs stops being sent after a few, with the copy kept and no upload every 20 seconds", async () => {
    const { queue, deps } = setup({
      send: jest.fn(async () => ({ complete: false, missing: ["back"] }) as unknown as Capture),
    });
    await queue.init("asha");
    queue.start(draft());
    record(queue);
    await queue.idle();
    for (let kick = 0; kick < 6; kick += 1) {
      queue.kick();
      await queue.idle();
    }
    const stopped = queue.getDrafts()[0];
    expect(stopped).toMatchObject({ done: false, desk: "files", error: { retry: false } });
    expect(stopped.shots.back.uri).toBe("file:///captures/back.jpg");
    expect(deps.discard).not.toHaveBeenCalled();
    // Stopped: another kick uploads and sends nothing.
    const sends = (deps.send as jest.Mock).mock.calls.length;
    const uploads = (deps.upload as jest.Mock).mock.calls.length;
    queue.kick();
    await queue.idle();
    expect((deps.send as jest.Mock).mock.calls.length).toBe(sends);
    expect((deps.upload as jest.Mock).mock.calls.length).toBe(uploads);
    expect(queue.hasWork()).toBe(false);
  });

  it("Try again after the stop sends the record once more, and a good answer lifts the stop", async () => {
    let lacking = true;
    const { queue, deps } = setup({
      send: jest.fn(async () => (lacking ? ({ complete: false, missing: ["back"] } as unknown as Capture) : complete)),
    });
    await queue.init("asha");
    queue.start(draft());
    record(queue);
    await queue.idle();
    for (let kick = 0; kick < 6; kick += 1) {
      queue.kick();
      await queue.idle();
    }
    expect(queue.getDrafts()[0].desk).toBe("files");
    lacking = false;
    queue.retry(ID);
    await queue.idle();
    const after = queue.getDrafts()[0];
    expect(after).toMatchObject({ done: true, error: null });
    expect(after.desk).toBeUndefined();
    expect(after.lost).toBeUndefined();
    // The server has it all: the files go.
    expect(deps.discard).toHaveBeenCalled();
  });

  it("a file the phone no longer holds that the server misses goes back to the person", async () => {
    const { queue } = setup({
      send: jest.fn(async () => ({ complete: false, missing: ["side"] }) as unknown as Capture),
    });
    await queue.init("asha");
    queue.start(draft());
    record(queue);
    await queue.idle();
    expect(queue.getDrafts()[0]).toMatchObject({ done: false, sealed: false, error: { retry: false } });
  });

  it("a 503 storage_unavailable on the send saves nothing, and the same body goes again on the next try", async () => {
    let down = true;
    const { queue, deps } = setup({
      send: jest.fn(async () => {
        if (down) throw answer(503, "storage_unavailable");
        return complete;
      }),
    });
    await queue.init("asha");
    queue.start(draft());
    record(queue);
    await queue.idle();
    expect(queue.getDrafts()[0]).toMatchObject({ done: false, sealed: true, error: { retry: true } });
    expect(deps.discard).not.toHaveBeenCalled();
    down = false;
    queue.kick();
    await queue.idle();
    const bodies = (deps.send as jest.Mock).mock.calls.map((c) => c[1]);
    expect(bodies.length).toBeGreaterThanOrEqual(2);
    expect(bodies[bodies.length - 1]).toEqual(bodies[0]);
    expect(queue.getDrafts()[0].done).toBe(true);
  });

  it("one bad record does not hold up another", async () => {
    const { queue } = setup({
      send: jest.fn(async (d: CaptureDraft) => {
        if (d.moment === "handover") throw answer(403, "forbidden");
        return complete;
      }),
    });
    await queue.init("asha");
    queue.start(draft());
    queue.start(draft("return"));
    record(queue);
    record(queue, "RN-24831:return:customer");
    await queue.idle();
    expect(queue.getDrafts().map((d) => d.done)).toEqual([false, true]);
  });

  it("starting twice gives the record already there", async () => {
    const { queue } = setup();
    await queue.init("asha");
    const first = queue.start(draft());
    queue.update(ID, (d) => addShot(d, "front", photo("front")));
    await queue.idle();
    expect(queue.start(draft()).shots.front).toBeDefined();
    expect(queue.getDrafts()).toHaveLength(1);
    expect(first.id).toBe(ID);
  });

  it("another account's records are not this one's to send", async () => {
    const { queue, deps } = setup({ upload: jest.fn(async () => Promise.reject(new Error("offline"))) });
    await queue.init("asha");
    queue.start(draft());
    record(queue);
    await queue.idle();
    await queue.init("ravi");
    expect(queue.getDrafts()).toEqual([]);
    expect(deps.load).toHaveBeenLastCalledWith("ravi");
  });

  it("a second caller of init waits for the same load", async () => {
    let release: (drafts: CaptureDraft[]) => void = () => undefined;
    const { queue } = setup({
      load: jest.fn(() => new Promise<CaptureDraft[]>((resolve) => (release = resolve))),
    });
    const first = queue.init("asha");
    let seen = false;
    const second = queue.init("asha").then(() => (seen = true));
    await Promise.resolve();
    expect(seen).toBe(false);
    release([{ ...draft(), shots: { front: { ...photo("front"), url: "https://bucket.test/front.jpg" } } }]);
    await first;
    await second;
    expect(queue.getDrafts()[0].shots.front.url).toBe("https://bucket.test/front.jpg");
  });

  it("tells a screen when something changes", async () => {
    const { queue } = setup();
    await queue.init("asha");
    const listener = jest.fn();
    const stop = queue.subscribe(listener);
    queue.start(draft());
    expect(listener).toHaveBeenCalled();
    stop();
    listener.mockClear();
    queue.update(ID, (d) => addShot(d, "front", photo("front")));
    await queue.idle();
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("a record that still waits for the other person's code is not complete (review: keep the files until the server says so)", () => {
  const theirs = () => startDraft({ number: "RN-24831", moment: "handover", side: "owner", forOther: true, list });
  const THEIRS = "RN-24831:handover:owner";
  const waitingForCode = { complete: false, missing: ["confirmation_code"] } as unknown as Capture;

  it("keeps the local files while the answer lists confirmation_code, and tells the draft what it waits for", async () => {
    const { queue, deps } = setup({ send: jest.fn(async () => waitingForCode) });
    await queue.init("asha");
    queue.start(theirs());
    record(queue, THEIRS);
    await queue.idle();
    const held = queue.getDrafts()[0];
    // Sent and uploaded, and waiting for the code: not complete.
    expect(held).toMatchObject({ done: true, awaitingCode: true });
    expect(deps.discard).not.toHaveBeenCalled();
    // Still kept on disk with the record, files and all.
    expect(held.shots.front.uri).toBe("file:///captures/front.jpg");
  });

  it("clears them when the code is confirmed and the record is complete", async () => {
    const { queue, deps } = setup({ send: jest.fn(async () => waitingForCode) });
    await queue.init("asha");
    queue.start(theirs());
    record(queue, THEIRS);
    await queue.idle();
    queue.update(THEIRS, codeConfirmed);
    await queue.idle();
    expect(queue.getDrafts()[0]).toMatchObject({ done: true, awaitingCode: false });
    expect(deps.discard).toHaveBeenCalledWith(
      expect.arrayContaining(["file:///captures/front.jpg", "file:///captures/back.jpg", "file:///captures/video.mp4"])
    );
  });

  it("a complete answer clears them at once, as before", async () => {
    const { queue, deps } = setup();
    await queue.init("asha");
    queue.start(draft());
    record(queue);
    await queue.idle();
    expect(deps.discard).toHaveBeenCalledWith(expect.arrayContaining(["file:///captures/front.jpg"]));
  });

  it("a file the server turns out to lack is sent again from the kept copy, not taken again", async () => {
    const send = jest.fn(async () => waitingForCode);
    const { queue, deps } = setup({ send });
    await queue.init("asha");
    queue.start(theirs());
    record(queue, THEIRS);
    await queue.idle();
    (deps.upload as jest.Mock).mockClear();
    // The confirm said "capture_incomplete: back": the record opens again for exactly that file.
    queue.update(THEIRS, (d) => reopenForMissing(d, ["back"]));
    await queue.idle();
    expect((deps.upload as jest.Mock).mock.calls.map((c) => c[0])).toEqual(["file:///captures/back.jpg"]);
    expect(send).toHaveBeenCalledTimes(2);
    expect(queue.getDrafts()[0]).toMatchObject({ done: true, awaitingCode: true });
    expect(deps.discard).not.toHaveBeenCalled();
  });

  it("is kept on disk with its files, so a restart still has them", async () => {
    const { queue, saved } = setup({ send: jest.fn(async () => waitingForCode) });
    await queue.init("asha");
    queue.start(theirs());
    record(queue, THEIRS);
    await queue.idle();
    const last = saved[saved.length - 1];
    expect(last).toHaveLength(1);
    expect(last[0]).toMatchObject({ id: THEIRS, awaitingCode: true });
  });
});
