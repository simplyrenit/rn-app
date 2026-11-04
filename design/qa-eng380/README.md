# ENG-380 — multi-device check, 4 Nov 2026

Captures (scaled to 800px tall) of the branch on four screen classes, QA backend, test account user_two.

| Prefix | Device | Size | How |
| --- | --- | --- | --- |
| `a360-` | Android 14 emulator, Nexus 5 profile | 360x640dp, xhdpi | dev client + Metro, adb taps |
| `a360-f13-` | same, system font scale 1.3 ("Large") | | |
| `p7-` | Android 14 emulator, Pixel 7 profile | 411x914dp | dev client + Metro |
| `se-`, `ios-se-` | iPhone SE (3rd gen) simulator, iOS 26.3 | 375x667pt, no notch | Release build, screens opened by a temporary launch-argument harness (not committed) |
| `pm-` | iPhone 17 Pro Max simulator | 440x956pt, Dynamic Island | same |

Before/after pairs for bugs found on the device pass:

- `a360-welcome` / `a360-welcome2`: carousel dots over the two-line copy.
- `a360-home-end` / `a360-home-end2`: 105dp blank after Home's last card (tab bar height counted twice).
- `a360-dates` / `a360-dates2`: "Deposit ₹3,000" breaking over two lines beside "Leave in cart".
- `a360-f13-home` / `a360-f13-home3`: category labels breaking mid-word at font scale 1.3.

Not walked: shop owner screens with data (signing the owner fixture in on an emulator would link that device to
the owner and can block the QA customer/shop pair), payment and refund steps, chat (off at launch), dark mode.
