# UI interaction bug sweep

Tracking doc for the "silly bugs" pass: dead X/back buttons, keyboard blocking
taps, and similar interaction breakage. Started 2026-08-20.

## Method

Two lanes, because the bug classes are found differently:

- **Lane A — code sweep.** Only for patterns that are *exhaustively* findable in
  source. Currently that means `keyboardShouldPersistTaps`. A grep for
  "touchable with no `onPress`" was tried and abandoned: it produced only false
  positives (`useRef<TouchableOpacity>` type annotations, and `style` props
  containing `>` in expressions like `wp(12.2) > 48`). Dead buttons are not
  reliably greppable.
- **Lane B — device walk.** Every screen on the iOS simulator, tapping every
  X, back, and submit control, with the keyboard both open and closed.

## Lane A: keyboard swallowing the first tap

React Native's default `keyboardShouldPersistTaps="never"` means that while a
keyboard is open, the first tap anywhere in the scroll view **only dismisses the
keyboard** — the button under the finger never fires. The user has to tap twice.
This is the single most likely cause of "keyboard not letting user click on
button".

Only 4 of 51 files containing a scrollable set this prop.

### Shared containers (highest leverage)

| Component | Used by | Status |
| --- | --- | --- |
| `src/components/core/scroll-container.tsx` | 6 screens incl. most of auth | [x] fixed |
| `src/components/core/container.tsx` | general | [x] fixed |

### Screens with their own scrollable + TextInput + button

| Screen | Status |
| --- | --- |
| `src/screens/auth/email.tsx` | [x] via ScrollContainer |
| `src/screens/auth/phone.tsx` | [x] via ScrollContainer |
| `src/screens/auth/password.tsx` | [x] via ScrollContainer |
| `src/screens/auth/confirm-password.tsx` | [x] via ScrollContainer |
| `src/screens/auth/about.tsx` | [x] via ScrollContainer |
| `src/screens/auth/verify.tsx` | [x] via ScrollContainer |
| `src/screens/search.tsx` | [x] persistTaps added (keyboard-covers-bar still open, see below) |
| `src/screens/products/write-review.tsx` | [x] fixed |
| `src/screens/post-screens/about-product.tsx` | [x] fixed |
| `src/screens/profileScreens/edit/edit-about-product.tsx` | [x] fixed |
| `src/screens/profileScreens/unavailability_form.tsx` | [x] fixed |

## Lane B: device walk

Legend: [ ] not visited · [x] pass · [!] bug found

### Unauthenticated
- [x] Welcome carousel — pass
- [x] Email screen — **fixed** invisible outline button (was white-on-white)
- [x] Phone screen — pass after button fix
- [x] Home tab — [!] category row clipped mid-word ("Fas…", "Mu…")
- [x] Home tab — [!] "Don't see what you need?" banner clipped by tab bar
- [x] Search screen — pass
- [x] Search results — **fixed** "1 results" grammar, added loading state
- [ ] Product detail
- [ ] Saved tab (guest)
- [ ] Category browse

### Authenticated (Yash signed in 2026-08-20)
- [x] Profile tab — pass; back button works
- [x] My listings — pass. "Pending approval" badge **verified**: both pending
      listings badged, the approved one not. `my/products/` returns 3 where it
      previously hid the pending ones.
- [x] Post flow: category → subcategory → about-product — pass
- [x] about-product form — **persistTaps fix verified on device**: with the
      keyboard open, the form scrolls without dismissing it, and a *single* tap
      on "Select Condition" opens the dropdown. Before the fix that tap was
      consumed dismissing the keyboard.
- [ ] Post flow: remaining steps (images, availability, review & submit)
- [ ] Chat list + chat detail
- [ ] Edit product flow
- [ ] Reviews / write review
- [ ] Saved tab (authenticated)

Note: the post form still has no `KeyboardAvoidingView`, so the keyboard covers
the lower half of the form and the Next button. It is now *reachable* by
scrolling with the keyboard open, which it was not before, but the same
underlying gap as the search screen remains.

## Testing gotchas

- The simulator uses the Mac's keyboard by default, so **no software keyboard
  appears and this entire bug class is invisible**. Enable it with
  `defaults write com.apple.iphonesimulator ConnectHardwareKeyboard -bool false`
  and relaunch Simulator.app.
- The simulator's text injection mangles uppercase and symbols: typing
  `AGENT_QA_20260820 Laptop` produced `aent-qa-20260820 laptop`. This is the
  harness, **not** the app — `about-product.tsx:435` uses a bare
  `onChangeText={setProductName}` with no transform. Use lowercase
  alphanumeric strings when testing input, and verify against source before
  reporting an input-mangling bug.
- React Navigation restores the previous screen across app restarts, so tap
  coordinates from a prior session may land on the wrong control. Navigate
  deliberately after each relaunch.

## Lane A follow-up: keyboard COVERS the action bar (separate bug, unfixed)

Reproduced on the simulator with the software keyboard enabled
(`defaults write com.apple.iphonesimulator ConnectHardwareKeyboard -bool false`
— without this the simulator uses the Mac keyboard and the bug is invisible).

On `src/screens/search.tsx`, focusing the "What?" field brings up the keyboard,
which then **completely covers the "Clear all" / "Search" action bar**. The
buttons are visible only as a blur behind the keyboard. This is distinct from
`keyboardShouldPersistTaps`: the control is not merely swallowing a tap, it is
physically unreachable.

`KeyboardAvoidingView` is imported in that file but never used.

**Attempt 1 (reverted, did not work):** wrapping the screen in
`<KeyboardAvoidingView behavior="padding">` inside `StaticContainer`, and
changing the inner `h-full` to `flex-1`. The bundle loaded cleanly and the
action bar still rendered under the keyboard. Reverted rather than leaving a
fix that does not fix anything.

Probable next step: `StaticContainer` renders
`SafeAreaView(flex:1) > View(flexGrow:1, no explicit flex)`, and the nesting
with `GestureHandlerRootView` may be denying the KAV a definite height to
shrink from. Either fix the container's flex chain, or bypass KAV entirely and
drive an explicit bottom padding from `Keyboard.addListener("keyboardWillShow")`,
which is layout-independent and always works.

Screens likely sharing this shape: any using `StaticContainer` with a pinned
bottom action bar plus a text field.

## Round 2 — fixed and verified on device

### Keyboard covering the bottom action bar — FIXED
`src/lib/use-keyboard-inset.ts` reports how much of the screen the keyboard
covers, and `StaticContainer` pads by that amount minus the safe-area inset
(SafeAreaView has already reserved that space). Verified on the search screen:
"Clear all" and "Search" now sit above the keyboard where they were previously
hidden behind it entirely. Covers the 27 screens built on `StaticContainer`.

**Android parity:** the hook returns 0 on Android by design. `MainActivity`
declares `windowSoftInputMode="adjustResize"`, so the OS already shrinks the
window; padding there too would double-compensate and push content off screen.
This is why the earlier `KeyboardAvoidingView behavior="padding"` approach was
both ineffective on iOS and the wrong shape for Android.

### Dead back button across the post flow — FIXED
`src/components/post/header.tsx` rendered its absolutely-positioned back
`TouchableOpacity` *before* a full-width `flex-1` sibling. Later siblings paint
on top in React Native, so the heading covered the arrow and swallowed every
tap. Verified: three taps did nothing before, navigation works after.

Fixed by sibling **ordering**, not `zIndex`/`elevation`, so behaviour is
identical on both platforms. Repairs the back arrow on all 10 screens using
this header: the whole post flow plus the edit-product flows.

Also added `hitSlop` and accessibility labels.

### Fullscreen image close button — HARDENED
`src/components/product/product-image.tsx` had the same shape but with
`zIndex: 1` carrying it. That works on iOS; zIndex-based touch handling on
Android is unreliable. Reordered so it does not depend on zIndex at all.

## Round 3 — fixed and verified on device

### Tab bar clipping the bottom of tab screens — FIXED
Home and Chat set no bottom padding, so their last content sat behind the tab
bar; on Home the "Don't see what you need?" card was cut mid-sentence and its
button unreachable. Saved padded a fixed `hp("10%")`, less than the iOS bar's
`hp("12.75%")`, so it clipped too. All three now use
`useBottomTabBarHeight()` — measured, because the bar differs between iOS and
Android and includes the safe-area inset. Verified on Home.

### Blocking dev alert over the Chat tab — FIXED
`src/backend/notifications.ts` raised `alert("Must use physical device for Push
Notifications")`, a developer diagnostic rendered as a **blocking modal** over
the UI. Worse, the sibling branch raised `alert("Failed to get push token…")`
on a **real device** whenever a user simply declined notification permission —
interrupting them with developer wording for a legitimate choice. Both are now
`console.warn`, which does not surface at all in production builds. Affects
Android identically.

### Chat detail keyboard — verified working
Chat contains no `KeyboardAvoidingView` at all; the message input clears the
keyboard because `chat-details.tsx` is built on `StaticContainer` and inherits
the `useKeyboardInset` fix from round 2.

### Dead back button in chat detail — FIXED
`src/components/chat/chat-header.tsx` called `navigation.navigate("Chat")`.
Navigating to a **tab** only focuses that tab; it does not pop the tab's stack,
which still had the detail screen on top — so the arrow fired and nothing
appeared to happen. Now `canGoBack() ? goBack() : navigate("Chat")`, keeping
the fallback for arriving via a push notification with nothing to pop.
Verified: returns to the chat list.

Swept for the same shape elsewhere — this was the only back control using
`navigate()` to a tab. The three other non-`goBack` handlers are sheet-close
callbacks and are correct.

### Count pluralization — FIXED
"The product will be unavailable for **1 days**", "1 results", "1 reviews".
A shared `src/lib/pluralize.ts` now formats every count, replacing the
hardcoded plural suffixes in both availability screens, both review counts,
the owner review count, the chat offer duration, and the search result count
(which had an inline ternary). Verified: reads "1 day".

### Edit-product flow — walked, no interaction bugs
Category / Product Details / Product Images / Unavailability all reachable;
back works throughout; the image remove-X works (image removed, add-tile
expands, submit correctly disables with no images). Nothing was persisted —
no save was tapped, and the listing was re-checked intact afterwards.

## Round 4 — fixed and verified

### Blocking alerts replaced with the app toast — FIXED
All eleven bare `alert()` calls now use the existing
`react-native-toast-message` `customToast`, and the wording drops the
developer voice ("Sorry, we need media library permissions to make this
work!" -> "Photo library access is needed to choose an image").

### Rating distribution rendered solid black with zero reviews — FIXED
`reviews-screen.tsx` computed the bar width as
`(item.count / totalReviews) * 100`. With no reviews that is `0/0` = NaN, the
width string became `"NaN%"`, React Native discarded it, and the filled bar
inherited its track's full width — so every row read as 100%. The average
rating was NaN for the same reason. Both are guarded now.

The screen also rendered a **0-star row**: the API returns buckets "0".."5"
though star ratings are 1-5. The client now ignores the 0 bucket rather than
changing the API contract.

### A listing was similar to itself — FIXED (backend, deployed)
`SimilarProductList` never excluded the product being viewed, so it appeared
in its own "Similar products" row. Verified live: now returns `[]`.

### Owner listing count leaked pending listings — FIXED (backend, deployed)
"About the owner" showed "3 products" where only 1 was publicly visible.
`get_products_listed` used a bare `Product.objects.filter(owner=...)` with no
active or approval filter, on a **public** serializer — inflating the number
and disclosing that the owner has pending or archived listings, the same leak
the approval filtering was meant to close. Verified live: now 1.

The visibility helpers moved to `product/utils.py` so serializers can share
them without importing views.

## Follow-up, deliberately not changed

The home category row cutting off "Fas…"/"Mu…" was investigated and is **not a
bug** — it is a horizontal ScrollView and the partial item is a standard scroll
peek. Likewise the vertical gap on auth screens is the intended
content-top/actions-bottom layout, not a defect.

## Round 5

### Keyboard covered the submit button on NonScrollableContainer — FIXED
Write-a-review pins its submit to the bottom, and the keyboard covered it plus
the star rating — the form could be typed into but not completed. Same fix as
StaticContainer, with two deliberate differences: the safe-area inset is NOT
subtracted (this SafeAreaView excludes the "bottom" edge, so reserves nothing
there), and `height: "100%"` was dropped from the container because a
percentage height resolves against the parent and ignores the padding. Covers
32 more screens. Verified on device.

Between this and StaticContainer, all 7 auth screens are now covered — they
all use StaticContainer, which was verified on the search screen.

### Backend test suite — now runs, and passes
Previously unverifiable (no Docker or Django on the Mac). It runs on the QA
server:

```
docker exec rn-api-web-1 sh -lc "cd /app/src && python manage.py test product review --noinput"
```

`--noinput` is required, otherwise a leftover `test_rn_api_qa` database makes
Django prompt and fail with EOFError. It only ever touches the `test_` database.

Two failures surfaced, both stale tests rather than code defects:

- `test_my_products_list_hides_unapproved_listings` asserted the behaviour
  deliberately reversed this session. Renamed and inverted, plus a companion
  test that the list still excludes other owners' listings.
- `FavoritesVisibilityTests.setUp` created fixtures without `admin_approved`,
  which defaults to False. Once `8c42957` made favourites filter on approval,
  even the "visible" products were excluded. **That commit has been shipping a
  failing test for a month** — it added `admin_approved` to the tests it wrote
  but not to this pre-existing setUp.

22 tests pass after the fix.

## Round 6 - launch, session and layout

Run on an iPhone 17 simulator (iOS 26.3) against QA, signed out. The QA
session from the previous round had expired, which is how the session bug
below surfaced.

### App.tsx: three defects at startup
- `if (error) throw error` for a failed font load, thrown from inside a
  useEffect. Nothing above it is an error boundary, so a font fetch failure
  was an unrecoverable crash. Returning null instead is no better: `loaded`
  stays false forever on error, leaving a blank screen under a splash that
  never hides. Fonts now degrade to the system font.
- `SplashScreen.preventAutoHideAsync()` and `hideAsync()` were unhandled
  promises. The first rejects routinely in the dev client ("no native splash
  screen registered for given view controller") and was the LogBox warning
  visible on every launch.
- `new QueryClient()` was called in the render body, so every re-render of App
  handed QueryClientProvider a new client and dropped the whole query cache.
  Latent today (App only re-renders while fonts load) but it turns any future
  state in App into silent cache loss.

### An expired session left the app stuck "signed in"
When the server rejects a refresh token the interceptor logged and rejected
but never cleared the stored tokens. Cold start happened to recover, because
`initialize()` catches the 401 from getMyDetails and calls logout(). A session
expiring *during* use did not: the app still looked signed in while every
authenticated request failed, with no route back to the sign-in screen.

The interceptor now reports expiry to the global context, which logs out and
says why. Deliberately narrow: only a 401/403 on the refresh call counts, so a
timeout, a dropped connection or a 5xx cannot turn a network blip into a
forced logout. A one-shot guard keeps a burst of parallel 401s to one logout.

### The search field's X button cleared nothing
react-native-autocomplete-dropdown spreads `textInputProps` *after* its own
`value`, so `selectedItem` controls the input; but its `onClearPress` only
resets internal state and never calls `onChangeText`. Tapping X blurred the
field (which looked like the keyboard swallowing the tap) and left the text.
Wiring `onClear` clears the app's state and the suggestion list.

### Product cards did not fill their column
The card image was `width: wp("41.5%") > 163 ? 163 : wp("41.5%")` with an
uncapped `height: wp("44.5%")` - two independent absolute numbers, one capped,
inside a card whose width is a percentage of the screen. Above ~393pt the
image stopped growing and the tile left a dead strip.

Underneath that, both the search results and owner product grids set
`alignItems: 'center'` on `contentContainerStyle`, which makes each row
shrink-wrap instead of filling the list, so the cards' "48.5%" resolved
against a collapsed row. That is why the tiles looked lopsided rather than
merely narrow. With rows filling again the alternating per-card
flex-start/flex-end is inert and was removed.

### Full-screen image close button sat under the status bar
`top: 10` inside a full-screen Modal puts the X in the status bar / notch
region on a notched iPhone. It did not take a tap there, so the viewer could
only be dismissed with the hardware back gesture. It now offsets by the safe
area inset (0 where there is none, so Android is unchanged).

### Legal copy named the wrong domain
Terms and Privacy both described the company website as "simplyenit.com".
Every other reference in the app is simplyrenit.com.

### Checked and found working (not bugs)
- The welcome carousel autoplays correctly; two samples that both landed on
  page 1 were coincidence, not a stalled carousel.
- Terms, Privacy, Skip and the email sign-in button all work. Earlier misses
  were my tap coordinates landing in margins, not dead controls.
- "Continue with Mobile OTP" renders as dark text on white - the original
  invisible-button bug from round 1, confirmed fixed on device.
- Place suggestions load and respond quickly; the reported "map search not
  showing recommendations" does not reproduce.
- Search is deliberately disabled until a "What?" term is entered, and is
  dimmed to show it.
- "1 result" - the pluralize fix, confirmed on device.
- A product-title search for "lap" returning nothing is correct: the QA
  dataset holds two approved products, "Lenovo" and "Garvit Babel", and the
  endpoint matches on title substrings.

## Known open issues (found, not yet fixed)

1. A full listing submission was not driven end to end. The interaction layer
   of that form is tested and fixed, but the submit/validation path is not:
   the image step needs a photo library, and a fresh simulator has none
   (`xcrun simctl addmedia` would unblock it).
2. Write-review submission was deliberately not exercised. It would
   permanently alter another owner's rating — unlabelled QA data, with no way
   to remove a review from the app.
