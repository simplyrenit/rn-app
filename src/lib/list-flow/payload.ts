import { parseRate } from "./deposit";
import { FieldName, ListingDraft } from "./types";

export interface ContactDetails {
  name: string;
  phone: string;
}

/**
 * The create body for `POST /api/my/products/` (§7.5).
 *
 * Today's shape — `transformProduct` in the old create flow was the reference —
 * plus the §5.2 additions. Images go as plain URLs in order, with the cover
 * picked out of the same list: the photos are already uploaded, so there is no
 * second upload of the cover as the old flow did.
 */
export function buildCreatePayload(draft: ListingDraft, contact: ContactDetails) {
  const f = draft.fields;
  const photos = draft.photos.filter((p) => p.status === "done" && p.remoteUrl);
  const coverPhoto = draft.photos[draft.coverIndex];
  const cover =
    coverPhoto?.status === "done" && coverPhoto.remoteUrl
      ? coverPhoto.remoteUrl
      : photos[0]?.remoteUrl ?? null;

  const fieldSources: Partial<Record<FieldName, string>> = {};
  (Object.keys(f) as FieldName[]).forEach((name) => {
    if (f[name].source !== "empty") fieldSources[name] = f[name].source;
  });

  const rate = parseRate(f.rate.value);
  const deposit = Number(f.security_deposit.value);
  const location = f.location.value;

  return {
    title: f.title.value?.trim() ?? "",
    description: f.description.value?.trim() ?? "",
    rate,
    security_deposit: Number.isFinite(deposit) ? deposit : 0,
    currency: "INR",
    category: f.category.value
      ? { parent: f.category.value.parent, title: f.category.value.title }
      : null,
    condition: f.condition.value ? f.condition.value.toLowerCase() : null,
    brand_name: f.brand_name.value?.trim() ?? "",
    model_name: f.model_name.value?.trim() ?? "",
    usage_description: f.usage_description.value?.trim() ?? "",
    coordinates: location ? { lat: location.lat, long: location.long } : null,
    location: location?.locality ?? "",
    full_address: location?.fullAddress?.trim() ?? "",
    images: photos.map((p) => p.remoteUrl as string),
    cover_image: cover,
    contact_name: contact.name,
    contact_number: contact.phone,
    blocked_dates: [] as { start_date: string; end_date: string }[],
    extraction_attempt_id: draft.attemptId,
    field_sources: fieldSources,
    photo_sources: photos.map((p) => p.source),
  };
}

export type CreatePayload = ReturnType<typeof buildCreatePayload>;
