/**
 * Formats a count with the right noun form: "1 day", "2 days", "0 days".
 *
 * Several screens interpolated a bare count next to a hardcoded plural, which
 * produced "1 days" and "1 results". Use this wherever a count is shown.
 */
export function pluralize(
  count: number,
  singular: string,
  plural: string = `${singular}s`
): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
