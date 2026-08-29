/**
 * How a rating is spoken.
 *
 * The app printed "0.0" beside a filled star for anyone who had not been rated
 * yet, and "0" beside one on the product page. To a customer that means a
 * person scored zero out of five — the worst possible host — so the marketplace
 * was advertising its newest sellers as its worst. A rating of nothing is not a
 * rating of zero, and it must never be drawn as a star.
 */

export interface RatingDisplay {
  /** True when there is a real score to show. */
  rated: boolean;
  /** "4.8", or the words to use when there is no score. */
  label: string;
  /** Longer form, for a screen with room. */
  longLabel: string;
}

export function describeRating(
  value: number | string | null | undefined,
  reviewCount?: number | null
): RatingDisplay {
  const score = Number(value);
  const count = Number(reviewCount ?? 0);
  const hasScore =
    Number.isFinite(score) && score > 0 && (reviewCount == null || count > 0);

  if (!hasScore) {
    return { rated: false, label: "New", longLabel: "No ratings yet" };
  }

  const label = score.toFixed(1);
  return {
    rated: true,
    label,
    longLabel:
      count > 0
        ? `${label} · ${count} ${count === 1 ? "review" : "reviews"}`
        : label,
  };
}
