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
    ...over,
  };
  return { queue: createPhotoQueue(deps), deps, saved };
}

const photo = (name: string) => ({ name, title: `Title ${name}`, uri: `file:///cache/${name}.jpg`, width: 3000, height: 2000 });

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
    queue.enqueue(photo("PRO_1"));
    queue.enqueue(photo("PRO_2"));
    await queue.idle();
    expect(order).toEqual(["up PRO_1.jpg", "attach PRO_1", "up PRO_2.jpg", "attach PRO_2"]);
    expect(deps.attach).toHaveBeenCalledWith("PRO_1", "https://bucket.test/PRO_1.jpg");
    expect(queue.getJobs().map((j) => j.status)).toEqual(["done", "done"]);
  });

  it("passes the photo's size on to the resize", async () => {
    const { queue, deps } = setup();
    await queue.init("shop1");
    queue.enqueue(photo("PRO_1"));
    await queue.idle();
    expect(deps.upload).toHaveBeenCalledWith("file:///cache/PRO_1.jpg", { width: 3000, height: 2000 });
  });

  it("keeps a photo whose upload failed, and sends the next one on", async () => {
    const upload = jest
      .fn<QueueDeps["upload"]>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue("https://bucket.test/b.jpg");
    const { queue, deps } = setup({ upload });
    await queue.init("shop1");
    queue.enqueue(photo("PRO_1"));
    queue.enqueue(photo("PRO_2"));
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
    const { id } = queue.enqueue(photo("PRO_1"));
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
    const { id } = queue.enqueue(photo("PRO_1"));
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
    const { id } = queue.enqueue(photo("PRO_1"));
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
    queue.enqueue(photo("PRO_1"));
    await queue.idle();
    expect(queue.getJobs()[0]).toMatchObject({ status: "gone", error: null });
  });

  it("keeps jobs on the phone until they are on their draft, and not after", async () => {
    const attach = jest.fn<QueueDeps["attach"]>().mockRejectedValueOnce(new Error("timeout")).mockResolvedValue(undefined);
    const { queue, saved } = setup({ attach });
    await queue.init("shop1");
    const { id } = queue.enqueue(photo("PRO_1"));
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
    queue.enqueue(photo("PRO_1"));
    await queue.idle();
    expect(seen).toHaveBeenCalled();
    const before = seen.mock.calls.length;
    stop();
    queue.enqueue(photo("PRO_2"));
    await queue.idle();
    expect(seen.mock.calls.length).toBe(before);
  });
});
