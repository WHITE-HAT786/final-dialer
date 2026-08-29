import React from "react";
import { View, StyleSheet } from "react-native";
import Screen from "@/src/components/Screen";
import { EmptyBlock } from "@/src/components/DataStates";

/**
 * Call recordings.
 *
 * There is deliberately NO app recording endpoint: pkg_call.recording_url is never
 * exposed to the client and there is no authenticated stream endpoint for it, so
 * in-app playback cannot be provided honestly. Rather than invent recordings, this
 * screen states plainly that recordings are unavailable in the app. Whether a call
 * has a recording is surfaced (read-only) on the Call Logs screen (has_recording).
 */
export default function Recordings() {
  return (
    <Screen title="Recordings" activeKey="recordings" showBack showSip={false} showBell={false}>
      <View style={styles.wrap}>
        <EmptyBlock
          icon="mic-off-outline"
          title="Recordings unavailable in the app"
          subtitle="Call recordings are managed by Depth Route and can't be played back here. Call Logs shows which calls were recorded."
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 20 },
});
