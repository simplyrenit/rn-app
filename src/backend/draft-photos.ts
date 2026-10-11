import { SHOP_DRAFTS_ENDPOINT, SHOP_PRODUCTS_ENDPOINT } from "@/lib/config";
import { NeedingDraft } from "@/lib/draft-photos";
import axiosInstance from "@/lib/networkUtils";

interface NeedingPage {
  results: NeedingDraft[];
  total_results: number;
  current_page: number;
  total_pages: number;
}

const PAGE_SIZE = 100;
// Ten pages is a thousand drafts: more than one walk-through is ever going to be.
const MAX_PAGES = 10;

/**
 * Every draft that needs a photo, oldest first, and how many there are
 * (`total_results`: the phone's "42"). Another page is read while there is one.
 * `403 not_shop_owner` is for the caller: this is for shops.
 */
export async function fetchAllNeedingPhotos(): Promise<{ drafts: NeedingDraft[]; total: number }> {
  const drafts: NeedingDraft[] = [];
  let total = 0;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data } = await axiosInstance.get<NeedingPage>(`${SHOP_DRAFTS_ENDPOINT}needing-photos/`, {
      params: { page, page_size: PAGE_SIZE },
    });
    drafts.push(...data.results);
    total = data.total_results;
    if (data.current_page >= data.total_pages) break;
  }
  return { drafts, total: Math.max(total, drafts.length) };
}

/**
 * Attaches one photo to a draft; the first one becomes the cover. Drafts only
 * (`409 wrong_status` for anything else); at most five (`409 too_many_photos`).
 * `url` is the photo's address on Renit's bucket, without the signature.
 */
export async function attachDraftPhoto(name: string, url: string): Promise<void> {
  await axiosInstance.post(`${SHOP_PRODUCTS_ENDPOINT}${encodeURIComponent(name)}/photos/add/`, { url });
}

/** The draft's photos as the server holds them now. */
export async function fetchDraftImages(name: string): Promise<string[]> {
  const { data } = await axiosInstance.get<{ images?: string[]; product?: { images?: string[] } }>(
    `${SHOP_PRODUCTS_ENDPOINT}${encodeURIComponent(name)}/`
  );
  return data.product?.images ?? data.images ?? [];
}
