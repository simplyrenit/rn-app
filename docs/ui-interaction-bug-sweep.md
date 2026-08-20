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

### Authenticated — BLOCKED
Needs Yash to sign in on the simulator; I don't type passwords.
- [ ] Profile tab
- [ ] My listings (+ verify new "Pending approval" badge renders)
- [ ] Post listing flow (multi-step, heaviest form flow)
- [ ] Chat list + chat detail
- [ ] Edit product flow
- [ ] Reviews / write review

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

## Known open issues (found, not yet fixed)

1. Home category row clipped mid-word with no scroll affordance.
2. "Don't see what you need?" banner clipped by the tab bar.
3. Large empty vertical gap on auth screens between field and buttons.
