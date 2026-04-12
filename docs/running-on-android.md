# Running the App on Android

## Options

### 1. Expo Go (quick UI testing)

```bash
npx expo start
```

Scan the QR code with the **Expo Go** app on your Android phone. Both devices must be on the same network.

> **Note:** Expo Go won't support custom native modules (Firebase, Google Maps, Google Sign-in). Use a development build instead.

### 2. Development Build (recommended for debugging)

```bash
npx expo run:android
```

- Builds a dev client with all native modules included
- Supports hot reload, React DevTools, and JS debugger
- Only needs to be built once — subsequent runs just reload JS
- Connect a physical device via USB or use an emulator

After the initial build, use `npx expo start --dev-client` to get a QR code that works with the custom dev client.

### 3. Android Emulator

```bash
npx expo start
```

Press `a` in the terminal to open in an Android emulator (requires Android Studio with an AVD configured).

### 4. EAS Cloud Build

```bash
eas build --platform android --profile development
```

Builds in the cloud and provides an APK/AAB to install.

## Debugging Tips

- Press `j` in the terminal to open **React DevTools**
- Press `m` to open the **dev menu** on the device
- Dev menu provides: network inspector, element inspector, and more
