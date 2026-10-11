/**
 * Which tapped notification the app has dealt with. The system hands out the last
 * tapped notification every time the listeners are set up (each sign-in), so a tap is
 * remembered by its id and answered once. A tap made while nobody is signed in is
 * dealt with too, by being dropped: otherwise it would open after the next sign-in,
 * for whoever signs in, showing them a request that is not theirs (review round 1,
 * finding 7).
 */
export function createTapLedger() {
  let last: string | null = null;
  return {
    /** The tap has been opened, or dropped. */
    handled: (id: string) => id === last,
    mark(id: string) {
      last = id;
    },
  };
}

export type TapLedger = ReturnType<typeof createTapLedger>;
