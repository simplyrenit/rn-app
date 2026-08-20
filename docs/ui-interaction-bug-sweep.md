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

## Follow-up, deliberately not changed

About a dozen bare `alert()` calls remain (permission denials, send failures)
in `product-images.tsx`, `edit-product-images.tsx`, `chat-input.tsx`, and
`PersonaldetailsSheet.tsx`. These are legitimate user-facing errors, so they
are not broken — but the app already ships a Toast system
(`react-native-toast-message`, `customToast`) used elsewhere, and blocking
native alerts are inconsistent with it. Converting them is a UX decision
(toasts auto-dismiss; a failed send may warrant a modal), so it is left as a
deliberate follow-up rather than churned here.

The home category row cutting off "Fas…"/"Mu…" was investigated and is **not a
bug** — it is a horizontal ScrollView and the partial item is a standard scroll
peek. Likewise the vertical gap on auth screens is the intended
content-top/actions-bottom layout, not a defect.

## Known open issues (found, not yet fixed)

1. The post-listing form still has no keyboard handling of its own; it is
   reachable by scrolling but the action bar is not lifted.
2. Not yet walked: remaining post steps (images, availability, submit), edit
   product flow, reviews / write review.
