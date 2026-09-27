/**
 * Search across the whole category tree (ENG-29).
 *
 * Taxonomy v2 has ~300 sub-categories under 16 parents, and a customer who
 * knows they have a "projector" should not have to guess which parent it sits
 * under. Pure, so it is unit-tested without React.
 */

interface Node {
  title: string;
}

export interface TaxonomyMatch<P, C> {
  parent: P;
  child: C;
}

/**
 * Lower case with accents stripped, so "decor" finds "Décor". `normalize` is
 * guarded because a JS engine built without Intl lacks it; there the search
 * is still case-insensitive, just not accent-insensitive.
 */
export function foldForSearch(text: string): string {
  const lowered = (text ?? "").toLowerCase();
  return typeof lowered.normalize === "function"
    ? lowered.normalize("NFD").replace(/[̀-ͯ]/g, "")
    : lowered;
}

/**
 * Every sub-category whose own title or parent title contains each word of the
 * query, in tree order. `label` adds the name the row is shown under (the app
 * renames some API titles), so what is on screen is also what is searchable.
 * An empty query returns nothing: the caller shows the parent list instead.
 */
export function searchTaxonomy<C extends Node, P extends Node & { subcategories?: C[] }>(
  categories: P[],
  query: string,
  label: (title: string) => string = (title) => title
): TaxonomyMatch<P, C>[] {
  const words = foldForSearch(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const matches: TaxonomyMatch<P, C>[] = [];
  for (const parent of categories) {
    const parentText = `${parent.title} ${label(parent.title)}`;
    for (const child of parent.subcategories ?? []) {
      const haystack = foldForSearch(`${parentText} ${child.title} ${label(child.title)}`);
      if (words.every((word) => haystack.includes(word))) {
        matches.push({ parent, child });
      }
    }
  }
  return matches;
}
