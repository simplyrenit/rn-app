import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import axiosInstance from "@/lib/networkUtils";
import { fetchAllNeedingPhotos } from "../draft-photos";
import { fetchOpenBlocks, fetchPickerProducts } from "../shop-today";

jest.mock("@react-native-async-storage/async-storage", () => ({ __esModule: true, default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() } }));
jest.mock("@/context/global-context", () => ({ useGlobalContext: () => ({}) }));
jest.mock("@/lib/networkUtils", () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock("@/lib/config", () => ({
  MY_PRODUCTS_ENDPOINT: "https://api.test/my/products/",
  SHOP_BLOCKS_ENDPOINT: "https://api.test/shop/blocks/",
  SHOP_TODAY_ENDPOINT: "https://api.test/shop/today/",
  SHOP_DRAFTS_ENDPOINT: "https://api.test/shop/drafts/",
  SHOP_PRODUCTS_ENDPOINT: "https://api.test/shop/products/",
}));

type Call = jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
const get = (axiosInstance as unknown as { get: Call }).get;

/**
 * A paged list as rn-api answers it (`RNPagination`). The server now answers the page size that was asked for (it used to
 * say 10 whatever was asked), so a loop that reads every page must follow `total_pages` / `links.next`, never a size of its own.
 */
function paged<T>(all: T[], asked: Record<string, unknown>, answeredSize: number = Number(asked.page_size)) {
  const size = Number(asked.page_size);
  const page = Number(asked.page ?? 1);
  const pages = Math.max(1, Math.ceil(all.length / size));
  return {
    links: { next: page < pages ? `https://api.test/x?page=${page + 1}` : null, previous: null },
    total_results: all.length,
    total_pages: pages,
    current_page: page,
    page_size: answeredSize,
    results: all.slice((page - 1) * size, page * size),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("reading every page of a list, whatever size the server says it used", () => {
  const drafts = Array.from({ length: 250 }, (_, i) => ({ name: `PRO_${i}`, title: `Item ${i}` }));

  it("the drafts that need photos: three pages of 100, in order, with the true total", async () => {
    get.mockImplementation(async (...args: unknown[]) => ({ data: paged(drafts, (args[1] as { params: Record<string, unknown> }).params) }));
    const out = await fetchAllNeedingPhotos();
    expect(out.drafts).toHaveLength(250);
    expect(out.total).toBe(250);
    expect(get.mock.calls.map((c) => (c[1] as { params: { page: number; page_size: number } }).params)).toEqual([
      { page: 1, page_size: 100 },
      { page: 2, page_size: 100 },
      { page: 3, page_size: 100 },
    ]);
  });

  it("is the same when the page-size field still says 10, as it used to (nothing reads it)", async () => {
    get.mockImplementation(async (...args: unknown[]) => ({ data: paged(drafts, (args[1] as { params: Record<string, unknown> }).params, 10) }));
    expect((await fetchAllNeedingPhotos()).drafts).toHaveLength(250);
  });

  it("the product picker reads every page and stops at the last", async () => {
    const products = Array.from({ length: 130 }, (_, i) => ({ name: `PRO_${i}`, title: `P${i}`, status: "live", shop_code: "", images: [] }));
    get.mockImplementation(async (...args: unknown[]) => ({ data: paged(products, (args[1] as { params: Record<string, unknown> }).params) }));
    await fetchPickerProducts();
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("the open blocks follow `links.next` and ask a hundred at a time", async () => {
    const block = (id: number) => ({ id, source: "quick" });
    const blocks = Array.from({ length: 101 }, (_, i) => block(i + 1));
    get.mockImplementation(async (...args: unknown[]) => ({ data: paged(blocks, (args[1] as { params: Record<string, unknown> }).params) }));
    const out = await fetchOpenBlocks();
    expect(out).toHaveLength(101);
    expect(get).toHaveBeenCalledTimes(2);
    expect((get.mock.calls[0][1] as { params: Record<string, unknown> }).params).toEqual({ open: true, page: 1, page_size: 100 });
  });
});
