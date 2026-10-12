/**
 * What the first step of the listing flow shows about the owner terms (ENG-122).
 *
 * Ordinarily the terms are asked once and a failed read holds nothing back: the
 * server refuses a submit without them and Preview sends the owner back here. After
 * such a refusal (`refused`) this step must not be a dead end: it says the terms
 * cannot be read and offers another try, and holds Continue until they have been.
 */
export type TermsGate = "tick" | "failed" | "checking" | "none";

export interface TermsState {
  /** `accepted` of the owner terms, once read; null before. */
  accepted: boolean | null | undefined;
  /** The terms have been read at least once. */
  read: boolean;
  /** The last read failed and there is nothing earlier to show. */
  failed: boolean;
  fetching: boolean;
  /** The server has refused a submit for the owner terms. */
  refused: boolean;
}

export function termsGate(state: TermsState): TermsGate {
  if (state.read && state.accepted === false) return "tick";
  if (state.failed) return "failed";
  if (state.refused && state.fetching) return "checking";
  return "none";
}

/** Whether Continue waits: for the tick, or after a refusal until the terms are read. */
export function termsHold(gate: TermsGate, ticked: boolean, refused: boolean): boolean {
  if (gate === "tick") return !ticked;
  return refused && (gate === "failed" || gate === "checking");
}

/**
 * The line that says why Continue and "I'll fill it in myself" are greyed, when the tick is what holds them (test run D-14):
 * they are greyed until the owner terms are ticked, and nothing said so. Null when the tick is not what holds them (it is
 * ticked, there is none to tick, or the terms could not be read, which has its own words).
 */
export function termsHoldLine(gate: TermsGate, ticked: boolean): string | null {
  return gate === "tick" && !ticked ? "Tick the owner terms to continue." : null;
}
