// Expo config plugin for expo-pjsip.
// Injects the Android permissions + foreground service and the iOS microphone/
// VoIP background capabilities the native SIP/UDP engine needs. This is applied
// during `expo prebuild`; it does NOT run in Expo Go.
const {
  withAndroidManifest,
  withInfoPlist,
  AndroidConfig,
} = require("@expo/config-plugins");

const ANDROID_PERMISSIONS = [
  "android.permission.INTERNET",
  "android.permission.RECORD_AUDIO",
  "android.permission.MODIFY_AUDIO_SETTINGS",
  "android.permission.ACCESS_NETWORK_STATE",
  "android.permission.WAKE_LOCK",
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.FOREGROUND_SERVICE_MICROPHONE",
  // Post-notification is required to show the ongoing-call/registration service on Android 13+
  "android.permission.POST_NOTIFICATIONS",
];

function withSipAndroid(config) {
  config = AndroidConfig.Permissions.withPermissions(config, ANDROID_PERMISSIONS);
  config = withAndroidManifest(config, (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    app.service = app.service || [];
    const exists = app.service.some(
      (s) => s.$?.["android:name"] === "expo.modules.pjsip.SipForegroundService",
    );
    if (!exists) {
      app.service.push({
        $: {
          "android:name": "expo.modules.pjsip.SipForegroundService",
          "android:exported": "false",
          "android:foregroundServiceType": "microphone",
        },
      });
    }
    return cfg;
  });
  return config;
}

function withSipIos(config) {
  return withInfoPlist(config, (cfg) => {
    cfg.modResults.NSMicrophoneUsageDescription =
      cfg.modResults.NSMicrophoneUsageDescription ||
      "This app needs the microphone to make and receive SIP phone calls.";
    const modes = new Set(cfg.modResults.UIBackgroundModes || []);
    modes.add("audio"); // keep RTP audio alive in background
    modes.add("voip"); // VoIP socket + PushKit wake for inbound
    cfg.modResults.UIBackgroundModes = Array.from(modes);
    return cfg;
  });
}

module.exports = function withPjsip(config) {
  config = withSipAndroid(config);
  config = withSipIos(config);
  return config;
};
