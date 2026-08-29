package expo.modules.pjsip

import org.pjsip.pjsua2.*
import java.util.UUID

/** pjsua2 Account with registration + incoming-call callbacks. */
class SipAccount(private val module: ExpoPjsipModule) : Account() {
  var currentRegState: String = "offline"

  override fun onRegState(prm: OnRegStateParam) {
    val code = prm.code   // pjsua2 SWIG bindings expose enums as plain Int
    val active = try { info.regIsActive } catch (_: Throwable) { false }
    currentRegState = when {
      code in 200..299 && active -> "registered"
      code in 200..299 -> "unregistered"
      code >= 400 -> "failed"
      else -> "registering"
    }
    module.emitRegState(currentRegState, code, prm.reason)
  }

  override fun onIncomingCall(prm: OnIncomingCallParam) {
    val call = SipCall(module, this, prm.callId)
    module.registerCall(call.callId, call)
    val ci = call.info
    module.emitIncoming(call.callId, ci.remoteUri, ci.remoteContact)
    module.emitCallState(call.callId, "ringing", direction = "incoming")
  }
}

/** pjsua2 Call with state + media callbacks; maps to a stable string callId. */
class SipCall : Call {
  private val module: ExpoPjsipModule
  val callId: String = UUID.randomUUID().toString()

  constructor(module: ExpoPjsipModule, acc: Account) : super(acc) { this.module = module }
  constructor(module: ExpoPjsipModule, acc: Account, cid: Int) : super(acc, cid) { this.module = module }

  override fun onCallState(prm: OnCallStateParam) {
    val ci = info
    val state = when (ci.state) {
      pjsip_inv_state.PJSIP_INV_STATE_CALLING -> "dialing"
      pjsip_inv_state.PJSIP_INV_STATE_INCOMING -> "ringing"
      pjsip_inv_state.PJSIP_INV_STATE_EARLY -> "ringing"
      pjsip_inv_state.PJSIP_INV_STATE_CONNECTING -> "connecting"
      pjsip_inv_state.PJSIP_INV_STATE_CONFIRMED -> "connected"
      pjsip_inv_state.PJSIP_INV_STATE_DISCONNECTED -> "ended"
      else -> "idle"
    }
    module.emitCallState(callId, state, ci.lastStatusCode, ci.lastReason)
  }

  /** Bridge the call's audio to the device capture/playback = two-way RTP audio. */
  override fun onCallMediaState(prm: OnCallMediaStateParam) {
    val ci = info
    for (i in 0 until ci.media.size) {
      val m = ci.media[i.toInt()]
      if (m.type == pjmedia_type.PJMEDIA_TYPE_AUDIO &&
          m.status == pjsua_call_media_status.PJSUA_CALL_MEDIA_ACTIVE) {
        val am = getAudioMedia(i.toInt())
        val mgr = Endpoint.instance().audDevManager()
        mgr.captureDevMedia.startTransmit(am)   // mic -> remote
        am.startTransmit(mgr.playbackDevMedia)  // remote -> speaker/earpiece
        module.emitCallState(callId, "connected")
      }
    }
  }

  fun setMuted(muted: Boolean) {
    val ci = info
    for (i in 0 until ci.media.size) {
      val m = ci.media[i.toInt()]
      if (m.type == pjmedia_type.PJMEDIA_TYPE_AUDIO && m.status == pjsua_call_media_status.PJSUA_CALL_MEDIA_ACTIVE) {
        val am = getAudioMedia(i.toInt())
        val mgr = Endpoint.instance().audDevManager()
        if (muted) mgr.captureDevMedia.stopTransmit(am) else mgr.captureDevMedia.startTransmit(am)
      }
    }
  }
}
