import { AiFieldName, Condition, ListingWarning, WarningType } from "@/lib/list-flow/types";

/** Field names as the owner reads them on L-13 and L-14. */
export const FIELD_LABEL: Record<AiFieldName, string> = {
  category: "Category",
  title: "Title",
  brand_name: "Brand",
  model_name: "Model",
  condition: "Condition",
  description: "Description",
};

export const CONDITION_LABEL: Record<Condition, string> = {
  excellent: "Excellent",
  good: "Good",
  fair: "Fair",
};

/** §8.4: the helper line under each condition option. */
export const CONDITION_HINT: Record<Condition, string> = {
  excellent: "like new",
  good: "light signs of use",
  fair: "clear wear",
};

/** Warnings that send the owner back to L-12 to reshoot (L-12b). */
export const RETAKE_WARNINGS: WarningType[] = ["stock_photo", "screenshot", "duplicate"];

/** §8.2 L-12b: the photo's tag while a warning stands against it. */
export const WARNING_TAG: Partial<Record<WarningType, string>> = {
  stock_photo: "Stock photo?",
  screenshot: "Screenshot?",
  duplicate: "Already listed?",
};

/** The warning text shown on L-12b and in the L-13 warning card. */
export function warningHeadline(warning: ListingWarning) {
  const photo = warning.photo ? `Photo ${warning.photo}` : "A photo";
  switch (warning.type) {
    case "stock_photo":
      return `${photo} looks like a stock photo. Renters trust a shot of your own item.`;
    case "screenshot":
      return `${photo} looks like a screenshot. Renters trust a shot of your own item.`;
    case "duplicate":
      return `${photo} matches a photo on another listing.`;
    case "unreadable":
      return "We couldn't read the label";
    case "not_an_item":
      return "We couldn't spot an item to rent";
    default:
      return "";
  }
}

/** A field label with its source mark (§8.4): "Title · AI", "Title · edited". */
export function labelWithSource(label: string, source: string) {
  if (source === "ai") return `${label} · AI`;
  if (source === "ai_edited") return `${label} · edited`;
  return label;
}

/**
 * The hint under an empty field the model looked at and could not fill:
 * "Label partly readable, photo 2 — add the model".
 */
export function evidenceHint(evidence: string | undefined, noun: string) {
  const text = evidence?.trim();
  if (!text) return undefined;
  return `${text[0].toUpperCase()}${text.slice(1)} — add the ${noun}`;
}
