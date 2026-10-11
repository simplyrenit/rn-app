import { describe, expect, it, jest } from "@jest/globals";
import { AxiosError } from "axios";
import { PhotoJob } from "@/lib/draft-photos";
import { QueueDeps, createPhotoQueue } from "../draft-photo-queue";

/** An axios error with an answer, the way the server's errors come. */
function answer(status: number, code: string): AxiosError {
  const error = new AxiosError("failed", undefined, undefined, undefined, {
    status,
    data: { error: { code, message: null, details: null } },
  } as never);
  return error;
}

function setup(over: Partial<QueueDeps> = {}) {
  let n = 0;
  const saved: PhotoJob[][] = [];
  const deps: QueueDeps = {
    upload: jest.fn(async (uri: string) => `https://bucket.test/uploads/${uri.split("/").pop()}`),
    attach: jest.fn(async () => undefined),
    images: jest.fn(async () => [] as string[]),
    load: jest.fn(async () => [] as PhotoJob[]),
    save: jest.fn(async (_account: string, jobs: PhotoJob[]) => {
      saved.push(jobs);
    }),
    makeId: () => `job-${++n}`,
    keep: jest.fn(async (uri: string) => uri.replace("/cache/", "/kept/")),
    exists: jest.fn(async () => true),
    discard: jest.fn(async () => undefined),
    ...over,
  };
  return { queue: createPhotoQueue(deps), deps, saved };
}

const photo = (name: string) => ({ name, title: `Title ${name}`, shop_code: `CODE-${name}`, uri: `file:///cache/${name}.jpg`, width: 3000, height: 2000 });

describe("the photo queue", () => {
  it("uploads each photo and attaches it to its draft, one at a time, in the order taken", async () => {
    const order: string[] = [];
    const { queue, deps } = setup({
      upload: jest.fn(async (uri: string) => {
        order.push(`up ${uri.split("/").pop()}`);
        return `https://bucket.test/${uri.split("/").pop()}`;
      }),
      attach: jest.fn(async (name: string) => {
        order.push(`attach ${name}`);
      }),
    });
    await queue.init("shop1");
    await queue.enqueue(photo("PRO_1"));
    await queue.enqueue(photo("PRO_2"));
    await queue.idle();
    expect(order).toEqual(["up PRO_1.jpg", "attach PRO_1", "up PRO_2.jpg", "attach PRO_2"]);
    expect(deps.attach).toHaveBeenCalledWith("PRO_1", "https://bucket.test/PRO_1.jpg");
    expect(queue.getJobs().map((j) => j.status)).toEqual(["done", "done"]);
  });

  it("passes the photo's size on to the resize", async () => {
    const { queue, deps } = setup();
    await queue.init("shop1");
    await queue.enqueue(photo("PRO_1"));
    await queue.idle();
    expect(deps.upload).toHaveBeenCalledWith("file:///kept/PRO_1.jpg", { width: 3000, height: 2000 });
  });

  it("keeps a photo whose upload failed, and sends the next one on", async () => {
    const upload = jest
      .fn<QueueDeps["upload"]>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue("https://bucket.test/b.jpg");
    const { queue, deps } = setup({ upload });
    await queue.init("shop1");
    await queue.enqueue(photo("PRO_1"));
    await queue.enqueue(photo("PRO_2"));
    await queue.idle();
    const [a, b] = queue.getJobs();
    expect(a).toMatchObject({ status: "failed", url: null, error: "It did not upload. Check your connection." });
    expect(b.status).toBe("done");
    expect(deps.attach).toHaveBeenCalledTimes(1);
  });

  it("retries a failed photo from the start, and it goes through", async () => {
    const upload = jest
      .fn<QueueDeps["upload"]>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue("https://bucket.test/a.jpg");
    const { queue } = setup({ upload });
    await queue.init("shop1");
    const { id } = await queue.enqueue(photo("PRO_1"));
    await queue.idle();
    expect(queue.getJobs()[0].status).toBe("failed");
    queue.retry(id);
    await queue.idle();
    expect(queue.getJobs()[0]).toMatchObject({ status: "done", error: null });
  });

  it("an attach with no answer keeps the address, and the retry reads the draft first: a photo that is there is not added twice", async () => {
    const attach = jest.fn<QueueDeps["attach"]>().mockRejectedValueOnce(new Error("timeout"));
    const images = jest.fn<QueueDeps["images"]>(async () => ["https://cdn.test/uploads/PRO_1.jpg"]);
    const { queue, deps } = setup({ attach, images });
    await queue.init("shop1");
    const { id } = await queue.enqueue(photo("PRO_1"));
    await queue.idle();
    expect(queue.getJobs()[0]).toMatchObject({ status: "failed", attachSent: true, url: "https://bucket.test/uploads/PRO_1.jpg" });

    queue.retry(id);
    await queue.idle();
    expect(images).toHaveBeenCalledWith("PRO_1");
    expect(queue.getJobs()[0].status).toBe("done");
    // Uploaded once, attached once.
    expect(deps.upload).toHaveBeenCalledTimes(1);
    expect(attach).toHaveBeenCalledTimes(1);
  });

  it("an attach with no answer whose photo is not there is attached again, without a second upload", async () => {
    const attach = jest.fn<QueueDeps["attach"]>().mockRejectedValueOnce(new Error("timeout")).mockResolvedValue(undefined);
    const { queue, deps } = setup({ attach });
    await queue.init("shop1");
    const { id } = await queue.enqueue(photo("PRO_1"));
    await queue.idle();
    queue.retry(id);
    await queue.idle();
    expect(queue.getJobs()[0].status).toBe("done");
    expect(deps.upload).toHaveBeenCalledTimes(1);
    expect(attach).toHaveBeenCalledTimes(2);
  });

  it("drops a photo whose draft is no longer a draft", async () => {
    const attach = jest.fn<QueueDeps["attach"]>().mockRejectedValue(answer(409, "wrong_status"));
    const { queue } = setup({ attach });
    await queue.init("shop1");
    await queue.enqueue(photo("PRO_1"));
    await queue.idle();
    expect(queue.getJobs()[0]).toMatchObject({ status: "gone", error: null });
  });

  it("keeps jobs on the phone until they are on their draft, and not after", async () => {
    const attach = jest.fn<QueueDeps["attach"]>().mockRejectedValueOnce(new Error("timeout")).mockResolvedValue(undefined);
    const { queue, saved } = setup({ attach });
    await queue.init("shop1");
    const { id } = await queue.enqueue(photo("PRO_1"));
    await queue.idle();
    // The last thing saved while it was failed still holds it.
    expect(saved.some((jobs) => jobs.some((j) => j.id === id && j.status === "failed"))).toBe(true);
    queue.retry(id);
    await queue.idle();
    expect(saved[saved.length - 1]).toEqual([]);
  });

  it("takes back what an earlier visit left, and starts an upload that was cut off again", async () => {
    const kept: PhotoJob[] = [
      { id: "old-1", name: "PRO_9", title: "Item 9", uri: "file:///cache/9.jpg", url: null, status: "uploading", error: null, attachSent: false },
      { id: "old-2", name: "PRO_8", title: "Item 8", uri: "file:///cache/8.jpg", url: null, status: "failed", error: "x", attachSent: false },
    ];
    const { queue, deps } = setup({ load: jest.fn(async () => kept) });
    await queue.init("shop1");
    await queue.idle();
    expect(deps.upload).toHaveBeenCalledTimes(1);
    expect(deps.attach).toHaveBeenCalledWith("PRO_9", "https://bucket.test/uploads/9.jpg");
    // The failed one waits for Retry.
    expect(queue.getJobs().find((j) => j.id === "old-2")?.status).toBe("failed");
  });

  it("does not send another account's photos: the queue starts empty for each account", async () => {
    const load = jest.fn(async (account: string) =>
      account === "shop2"
        ? []
        : [{ id: "old", name: "PRO_9", title: "Item 9", uri: "file:///cache/9.jpg", url: null, status: "failed" as const, error: "x", attachSent: false }]
    );
    const { queue } = setup({ load });
    await queue.init("shop1");
    expect(queue.getJobs()).toHaveLength(1);
    await queue.init("shop2");
    expect(queue.getJobs()).toEqual([]);
    expect(load).toHaveBeenCalledWith("shop2");
  });

  it("tells a screen when anything changes", async () => {
    const { queue } = setup();
    const seen = jest.fn();
    const stop = queue.subscribe(seen);
    await queue.init("shop1");
    await queue.enqueue(photo("PRO_1"));
    await queue.idle();
    expect(seen).toHaveBeenCalled();
    const before = seen.mock.calls.length;
    stop();
    await queue.enqueue(photo("PRO_2"));
    await queue.idle();
    expect(seen.mock.calls.length).toBe(before);
  });
});

describe("review round 1, finding 5: a photo is not attached twice when the app is closed during the attach call", () => {
  const inFlight: PhotoJob = {
    id: "old-1",
    name: "PRO_9",
    title: "Item 9",
    uri: "file:///kept/9.jpg",
    url: "https://bucket.test/uploads/9.jpg",
    status: "uploading",
    error: null,
    attachSent: true,
  };

  it("saves 'the attach is on its way' before the call goes out", async () => {
    const order: string[] = [];
    const save = jest.fn(async (_account: string, jobs: PhotoJob[]) => {
      if (jobs.some((j) => j.attachSent)) order.push("saved attachSent");
    });
    const attach = jest.fn(async () => {
      order.push("attach");
    });
    const { queue } = setup({ save, attach });
    await queue.init("shop1");
    await queue.enqueue(photo("PRO_1"));
    await queue.idle();
    expect(order).toEqual(["saved attachSent", "attach"]);
  });

  it("a restored job that was in the middle of an attach reads the draft first, and is done if the photo is there", async () => {
    const images = jest.fn(async () => ["https://cdn.test/uploads/9.jpg"]);
    const { queue, deps } = setup({ load: jest.fn(async () => [inFlight]), images });
    await queue.init("shop1");
    await queue.idle();
    expect(images).toHaveBeenCalledWith("PRO_9");
    expect(deps.attach).not.toHaveBeenCalled();
    expect(deps.upload).not.toHaveBeenCalled();
    expect(queue.getJobs()[0].status).toBe("done");
  });

  it("and attaches it when the photo is not there", async () => {
    const { queue, deps } = setup({ load: jest.fn(async () => [inFlight]), images: jest.fn(async () => []) });
    await queue.init("shop1");
    await queue.idle();
    expect(deps.attach).toHaveBeenCalledTimes(1);
    expect(deps.attach).toHaveBeenCalledWith("PRO_9", "https://bucket.test/uploads/9.jpg");
    expect(deps.upload).not.toHaveBeenCalled();
  });
});

describe("review round 1, finding 4: a photo that can never upload can be removed and its draft shot again", () => {
  const stuck: PhotoJob = {
    id: "old-2",
    name: "PRO_8",
    title: "Item 8",
    shop_code: "LGT-08",
    uri: "file:///gone/8.jpg",
    url: null,
    status: "queued",
    error: null,
    attachSent: false,
  };

  it("a restored job whose file is gone fails once, says the photo is gone, and is not retried", async () => {
    const exists = jest.fn(async () => false);
    const { queue, deps } = setup({ load: jest.fn(async () => [stuck]), exists });
    await queue.init("shop1");
    await queue.idle();
    expect(queue.getJobs()[0]).toMatchObject({
      status: "failed",
      missing: true,
      error: "The photo is no longer on this phone. Take it again.",
    });
    expect(deps.upload).not.toHaveBeenCalled();
    queue.retryAll();
    await queue.idle();
    expect(deps.upload).not.toHaveBeenCalled();
    expect(queue.getJobs()[0].status).toBe("failed");
  });

  it("'Take again' lets go of the failed photos, files included, and hands them back for their drafts", async () => {
    const { queue, deps } = setup({ load: jest.fn(async () => [stuck]), exists: jest.fn(async () => false) });
    await queue.init("shop1");
    await queue.idle();
    const removed = queue.removeFailed();
    expect(removed.map((j) => ({ name: j.name, shop_code: j.shop_code }))).toEqual([{ name: "PRO_8", shop_code: "LGT-08" }]);
    expect(queue.getJobs()).toEqual([]);
    expect(deps.discard).toHaveBeenCalledWith(["file:///gone/8.jpg"]);
  });

  it("a photo that failed for another reason can be removed too, whatever the server said", async () => {
    const attach = jest.fn<QueueDeps["attach"]>().mockRejectedValue(answer(403, "forbidden"));
    const { queue } = setup({ attach });
    await queue.init("shop1");
    await queue.enqueue(photo("PRO_1"));
    await queue.idle();
    expect(queue.getJobs()[0].status).toBe("failed");
    expect(queue.removeFailed()).toHaveLength(1);
    expect(queue.getJobs()).toEqual([]);
  });

  it("does not touch photos that are on their way when the failed ones are removed", async () => {
    const upload = jest
      .fn<QueueDeps["upload"]>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockImplementation(() => new Promise(() => undefined));
    const { queue } = setup({ upload });
    await queue.init("shop1");
    await queue.enqueue(photo("PRO_1"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await queue.enqueue(photo("PRO_2"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(queue.getJobs().map((j) => j.status)).toEqual(["failed", "uploading"]);
    expect(queue.removeFailed().map((j) => j.name)).toEqual(["PRO_1"]);
    expect(queue.getJobs().map((j) => j.name)).toEqual(["PRO_2"]);
  });

  it("a new photo of a draft replaces the photos of it that failed", async () => {
    const upload = jest
      .fn<QueueDeps["upload"]>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue("https://bucket.test/uploads/new.jpg");
    const { queue, deps } = setup({ upload });
    await queue.init("shop1");
    await queue.enqueue(photo("PRO_1"));
    await queue.idle();
    expect(queue.getJobs()).toHaveLength(1);
    await queue.enqueue({ ...photo("PRO_1"), uri: "file:///cache/again.jpg" });
    await queue.idle();
    expect(queue.getJobs().map((j) => j.status)).toEqual(["done"]);
    expect(deps.discard).toHaveBeenCalledWith(["file:///kept/PRO_1.jpg"]);
  });

  it("moves each photo out of the cache when it is queued, and deletes the file once it is on its draft", async () => {
    const { queue, deps } = setup();
    await queue.init("shop1");
    await queue.enqueue(photo("PRO_1"));
    await queue.idle();
    expect(deps.keep).toHaveBeenCalledWith("file:///cache/PRO_1.jpg");
    expect(deps.discard).toHaveBeenCalledWith(["file:///kept/PRO_1.jpg"]);
  });

  it("the app's root and the walk-through can both ask to take back the jobs: the second waits for the first", async () => {
    let release: (jobs: PhotoJob[]) => void = () => undefined;
    const load = jest.fn(() => new Promise<PhotoJob[]>((resolve) => (release = resolve)));
    const { queue } = setup({ load, exists: jest.fn(async () => false) });
    const first = queue.init("shop1");
    const second = queue.init("shop1");
    release([stuck]);
    await Promise.all([first, second]);
    expect(load).toHaveBeenCalledTimes(1);
    expect(queue.getJobs()).toHaveLength(1);
  });
});
