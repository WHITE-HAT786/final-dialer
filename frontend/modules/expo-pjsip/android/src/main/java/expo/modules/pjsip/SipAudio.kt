package expo.modules.pjsip

import android.content.Context
import android.media.AudioManager

/** Speaker/earpiece routing for the in-call audio path. */
object SipAudio {
  fun setSpeaker(ctx: Context?, enabled: Boolean) {
    val am = ctx?.getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return
    am.mode = AudioManager.MODE_IN_COMMUNICATION
    @Suppress("DEPRECATION")
    am.isSpeakerphoneOn = enabled
  }
}
