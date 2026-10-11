import { describe, expect, it, jest } from "@jest/globals";
import { AxiosError } from "axios";
import { Capture, CaptureDraft, ShotList, addShot, seal, setVideo, startDraft, tick } from "../capture";
import { CaptureQueueDeps, FileGone, createCaptureQueue } from "../capture-queue";

/** An axios error with an answer, the way the server's errors come. */
function answer(status: number, code: string): AxiosError {
  return new AxiosError("failed", undefined, undefined, undefined, {
    status,
    data: { error: { code, message: null, details: null } },
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

  it("a send the server refuses for good is not repeated by the timer, only by the person", async () => {
    const send = jest.fn(async () => {
      throw answer(409, "stage_not_allowed");
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

  it("what the server still misses goes back to the person", async () => {
    const { queue } = setup({
      send: jest.fn(async () => ({ complete: false, missing: ["back"] }) as unknown as Capture),
    });
    await queue.init("asha");
    queue.start(draft());
    record(queue);
    await queue.idle();
    const d = queue.getDrafts()[0];
    expect(d).toMatchObject({ done: false, sealed: false });
    expect(d.shots.back).toBeUndefined();
  });

  it("one bad record does not hold up another", async () => {
    const { queue } = setup({
      send: jest.fn(async (d: CaptureDraft) => {
        if (d.moment === "handover") throw answer(409, "stage_not_allowed");
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
