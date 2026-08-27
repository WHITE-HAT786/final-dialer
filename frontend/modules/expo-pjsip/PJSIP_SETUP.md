# expo-pjsip — native PJSIP setup

This module needs the PJSIP native libraries. They are **not** committed (large,
platform-specific). Build/obtain them once and drop them in place, then
`expo prebuild` + a Development Build will link everything.

The app is **not runnable in Expo Go** — it requires a Development Build.

## Android (pjsua2)
1. Build PJSIP for Android with the SWIG **Java** target, per-ABI (arm64-v8a,
   armeabi-v7a, x86_64):
   - `./configure-android --use-ndk-cflags` then `make dep && make`
   - `cd pjsip-apps/src/swig && make` → produces `pjsua2.jar` + `libpjsua2.so`
2. Copy:
   - `pjsua2.jar` → `modules/expo-pjsip/android/libs/pjsua2.jar`
   - `libpjsua2.so` (each ABI) → `modules/expo-pjsip/android/src/main/jniLibs/<abi>/libpjsua2.so`

## iOS (pjsua C API)
1. Build PJSIP for iOS device + simulator (arm64), producing `.a` libs
   (`libpjsua-*`, `libpjsip-*`, `libpjmedia-*`, `libpj-*`, …) and headers.
2. Package them as `vendor/pjsip.xcframework` (or add the `.a` libs directly) and
   uncomment `vendored_frameworks` / `HEADER_SEARCH_PATHS` in `ExpoPjsip.podspec`.
3. Uncomment `#import <pjsua-lib/pjsua.h>` in `PjsipEngine.mm` and fill in the
   pjsua calls sketched there.

## Build
```
npx expo prebuild --clean
npx expo run:android      # Android Development Build
npx expo run:ios          # iOS Development Build (macOS + Xcode)
```
The config plugin (`app.plugin.js`) injects the Android permissions + foreground
service and the iOS microphone/VoIP background modes automatically.

## Inbound while backgrounded (production)
- **Android:** `SipForegroundService` keeps registration alive; use
  `ConnectionService` + a high-priority notification for the incoming-call UI.
- **iOS:** a persistent UDP registration is not allowed in the background —
  production inbound requires **PushKit** (VoIP push from the server on an
  incoming call) + **CallKit** to present the call and wake the app to answer via
  SIP. This is a server + Apple-push integration beyond this module.
