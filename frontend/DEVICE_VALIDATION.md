# Native SIP/UDP — Device Validation Handoff

This is the exact procedure to validate the mobile app's **native SIP-over-UDP**
calling on a machine that has the Android/iOS toolchains + a physical device.
Nothing here may run against production.

```
Acceptance chain (each layer needs its OWN evidence):
APP → native PJSIP → SIP/UDP → staging Asterisk → RTP → CDR → server-side billing → portal → billing_transactions
```

Architecture is two separate paths:
- **(A) App API:** app → HTTPS → WebDialer PHP (`/api/app/*`) → WalletService → portal wallet.
- **(B) Calling:** app → NativeSipEngine → expo-pjsip (PJSIP) → **SIP/UDP** → staging Asterisk → PSTN.
Calls never traverse the PHP API. Billing is server-side; the app never sends duration/cost/debit.

---

## 0. Prerequisites (BLOCKED until provided)

| Need | Why |
|------|-----|
| Build machine w/ **JDK 17, Android SDK + NDK, Gradle, adb** | Android Development Build |
| **macOS + Xcode + CocoaPods** | iOS Development Build |
| **PJSIP artifacts** (§1) | native module links |
| Physical **Android device** (+ iOS device for iOS) | real SIP/RTP/audio |
| Reachable, **functional staging Asterisk** (UDP 5060) | registration + calls |
| Disposable **staging** WebDialer customer + UDP extension + portal wallet (§3) | never a real customer |

## 1. PJSIP artifact contract (do NOT fake or substitute)

**Android** — build PJSIP with the SWIG **Java** target, per ABI:
- `modules/expo-pjsip/android/libs/pjsua2.jar`
- `modules/expo-pjsip/android/src/main/jniLibs/arm64-v8a/libpjsua2.so`
- `.../armeabi-v7a/libpjsua2.so`
- `.../x86_64/libpjsua2.so` (emulator)

**iOS** — build PJSIP for device+sim (arm64):
- `modules/expo-pjsip/ios/vendor/pjsip.xcframework` (or the `.a` libs + headers)
- Then uncomment `vendored_frameworks`/`HEADER_SEARCH_PATHS` in `ExpoPjsip.podspec`
  and `#import <pjsua-lib/pjsua.h>` + fill the pjsua calls in `PjsipEngine.mm`.

Build steps: `pjsip-apps/src/swig` (Android), standard iOS PJSIP build (see `PJSIP_SETUP.md`).
**If absent → PJSIP BUILD ARTIFACTS = BLOCKED — MISSING.**

## 2. Build

```bash
cd frontend
cp .env.example .env            # set EXPO_PUBLIC_BACKEND_URL to the staging origin
yarn install
npx tsc --noEmit                # must be 0
npx expo prebuild --clean
npx expo run:android            # Android Development Build → device
npx expo run:ios                # iOS Development Build (macOS only)
```
Config plugin auto-injects: Android perms (RECORD_AUDIO, MODIFY_AUDIO_SETTINGS,
WAKE_LOCK, FOREGROUND_SERVICE(+MICROPHONE), POST_NOTIFICATIONS) + `SipForegroundService`;
iOS `NSMicrophoneUsageDescription` + `UIBackgroundModes [audio, voip]`.

## 3. Disposable staging account (never production)

On staging WebDialer DB (`webdialer_p2b_clone`), create ONE disposable customer +
a **UDP** extension, and map + fund a disposable portal wallet:

```sql
-- password bcrypt of 'Secret123!'
INSERT INTO pkg_user (full_name,username,email,password,status,is_admin,created_at)
  VALUES ('DevTest','zzdev_a','zzdev_a@t.local','<bcrypt>','active',0,NOW());
SET @u := LAST_INSERT_ID();
INSERT INTO pkg_extension (user_id,extension,name,device_type,endpoint,sip_password,webrtc_secret,enabled,is_primary,created_at,updated_at)
  VALUES (@u,'7001','DevTest','udp','dev7001','<devpass>','',1,1,NOW(),NOW());
-- map to a disposable portal account (pkg_platform_sip_account) and fund via WalletService credit.
```
Then **provision the extension into the staging Asterisk** (the endpoint must exist
as a PJSIP UDP endpoint with `<devpass>`) via the existing provisioning/EndpointSync —
this is the one step that touches the **staging** Asterisk; never touch prod Asterisk.

Verify the app receives ONLY its own config (no secrets):
```bash
TOKEN=$(curl -s -X POST -d '{"username":"zzdev_a","password":"Secret123!"}' \
  <origin>/backend/api/app/login.php | jq -r .data.token)
curl -s -H "Authorization: Bearer $TOKEN" <origin>/backend/api/app/sip-config.php | jq
# expect transport=UDP, server, port, username=dev7001, password=<devpass>;
# NO remote_account_id, NO HMAC, NO provider trunk password.
```

## 4–5. SIP REGISTRATION + OUTBOUND (App + Asterisk evidence — never UI-only)

Capture on staging Asterisk (use the STAGING instance's socket, not prod):
```
asterisk -rx "pjsip set logger on"            # SIP packet trace
asterisk -rx "pjsip show endpoint dev7001"
asterisk -rx "pjsip show registrations"
asterisk -rx "core show channels"
```

| Test | App evidence | Asterisk evidence | Expected |
|------|--------------|-------------------|----------|
| REGISTER + 401 + auth REGISTER + 200 | status → `registered` | `pjsip set logger` shows REGISTER→401→REGISTER(auth)→200; `pjsip show registrations` = Registered | PASS |
| refresh | stays registered past expiry/2 | periodic REGISTER 200 | PASS |
| unregister | status → `unregistered` | REGISTER expires=0 → 200; endpoint Unavailable | PASS |
| invalid password | status → `registration_failed` | 401 then 403/no 200 | PASS |
| server unavailable | status not "registered" | no response / timeout | PASS |
| outbound answered | dialing→ringing→connected | INVITE→100→180/183→200→ACK; RTP; BYE on hangup | PASS |
| busy/486, no-answer/408, 4xx/5xx/6xx, cancel | matching CallState | matching final SIP code | PASS |

The app must send **no** rate/duration/cost/balance/debit. Confirm request bodies (only the dialed number).

## 6. INBOUND
Originate a staging call toward `dev7001`. Verify incoming INVITE → ringing UI →
answer → two-way RTP → BYE. Confirm the call reaches ONLY `dev7001` (the registered
disposable extension), never another account.

## 7. TWO-WAY RTP / AUDIO (mandatory — signaling is NOT sufficient)
```
asterisk -rx "pjsip show channelstats"     # RTP tx/rx packet + loss counters
asterisk -rx "rtp set debug on"
```
Verify mic→remote and remote→speaker with **non-zero RTP tx AND rx** counters, then
earpiece/speaker/mute/unmute/Bluetooth. Human-confirm audible two-way audio.

## 8. DTMF (real IVR)
Point an outbound call at a staging IVR. Send `0 1 2 3 4 5 6 7 8 9 * #`. Verify the
**IVR received digit** (RFC2833 `telephone-event` in the SIP/RTP trace + the IVR log),
not just the button press.

## 9. NETWORK LOSS / RECONNECT
Toggle Wi-Fi off/on, and Wi-Fi↔mobile-data, during registration and during an active
call. Verify: registration-loss detected → offline UI → single re-REGISTER (no
duplicates); no stuck call, no orphan dialog/RTP (`core show channels` returns to
baseline).

## 10–12. WALLET / BILLING / CDR (ONE answered outbound call, disposable account)

**Before** (record):
```sql
-- portal side (via WalletService::balance / transactions for @u)
-- billing_transactions count for the disposable portal account
SELECT COALESCE(SUM(balance),0) FROM pkg_wallet;                 -- frozen legacy
SELECT COUNT(*) FROM pkg_wallet_transaction;                     -- frozen legacy
```
Place exactly ONE answered outbound call, then **after**:
- **CDR** (`pkg_call`): row exists with correct `user_id` (=@u), `extension`,
  caller, destination, `started_at`/`answered_at`/`ended_at`, `duration_sec`, SIP code.
- **Portal debit:** a new `billing_transactions` row for the disposable portal account;
  `balance_after` reduced by the rated charge.
- **Invariant:** `portal balance == SUM(billing_transactions)` for that account.
- **pkg_wallet UNCHANGED:** `SUM(pkg_wallet.balance)` and `pkg_wallet_transaction` count
  identical to Before (0 customer-money writes).
- **Identity:** the CDR `user_id` and the portal wallet resolve to the SAME server-side
  customer (@u) — the app never selected it.

## 13. FAILURE / FAIL-CLOSED
insufficient balance · portal unavailable · portal timeout · reg failure · call failure ·
no-answer · local/remote hangup → **no fabricated success, no unauthorized/duplicate
debit, no pkg_wallet write.** (The switch is the authoritative call-time funds gate.)

## 14. STABILITY
10× register cycles, 10× outbound, 10× hangup, several inbound. Watch device
memory/CPU + native crashes, and `asterisk -rx "core show channels"` /
`pjsip show registrations` — everything returns to baseline (no orphan dialogs/RTP).

---

## Native code static security review (done at source level)
Files: `ExpoPjsipModule.kt`, `SipAccountCall.kt`, `SipAudio.kt`, `SipForegroundService.kt`,
`ExpoPjsipModule.swift`, `PjsipEngine.h/.mm`, `NativeSipEngine.ts`.
- **Fixed:** double-`initialize` guard (tearDown on re-init); pjsua2 foreign-thread
  registration (`libRegisterThread`) on every call op; `ConcurrentHashMap` for calls;
  foreground service start/stop on register/unregister/destroy; idempotent `wire()`
  (no listener leak). *(Kotlin/Swift not compile-verified — no toolchain; verify on build.)*
- **No credential logging / persistence** in native source (verified by scan). SIP
  password is only used to build the pjsua account; never logged.
- **Identity is server-side only:** the client cannot select uid/account_id/extension;
  config comes solely from `/api/app/sip-config.php`.
- **To verify on device:** run the "10× init/register/unregister/destroy" cycle and
  confirm no leak/crash/stale registration; confirm audio session + RTP torn down after
  BYE; `strings` the APK/IPA for any SIP password (must be none).

## Production safety
Staging only. Do NOT deploy, reload/restart prod Asterisk, create prod SIP accounts /
Forward Groups, place prod calls, or modify prod wallet/pkg_wallet/portal billing/env.
