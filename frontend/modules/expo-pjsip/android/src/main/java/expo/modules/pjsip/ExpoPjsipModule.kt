package expo.modules.pjsip

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.pjsip.pjsua2.*
import java.util.concurrent.ConcurrentHashMap

/**
 * Native SIP/UDP engine (PJSIP / pjsua2). Signaling is UDP; media is RTP.
 * This never touches the wallet or any HTTPS API — telephony only.
 *
 * The pjsua2 Java bindings (pjsua2.jar) and the per-ABI libpjsua2.so must be
 * present (see PJSIP_SETUP.md). System.loadLibrary is called lazily.
 */
class ExpoPjsipModule : Module() {
  private var ep: Endpoint? = null
  private var account: SipAccount? = null
  // Shared between the JS async thread and pjsua callback threads -> thread-safe.
  private val calls = ConcurrentHashMap<String, SipCall>()

  /** pjsua2 requires any thread that calls into it to be registered first. */
  private fun ensurePjThread() {
    try {
      val e = ep ?: return
      if (!e.libIsThreadRegistered()) e.libRegisterThread(Thread.currentThread().name)
    } catch (_: Throwable) { /* best effort */ }
  }

  private fun tearDown() {
    try {
      calls.values.forEach { try { it.hangup(CallOpParam(true)) } catch (_: Throwable) {} }
      calls.clear()
      account?.delete(); account = null
      ep?.libDestroy(); ep?.delete(); ep = null
    } catch (_: Throwable) {}
  }

  override fun definition() = ModuleDefinition {
    Name("ExpoPjsip")

    Events(
      "onRegState", "onIncomingCall", "onCallState", "onDtmf", "onAudioState", "onError"
    )

    AsyncFunction("initialize") { config: Map<String, Any?> ->
      try {
        if (ep != null) tearDown()   // guard against double-initialize (would crash pjsua)
        System.loadLibrary("pjsua2")
        val e = Endpoint()
        e.libCreate()
        val epCfg = EpConfig()
        epCfg.uaConfig.userAgent = "DepthRouteMobile/1.0 pjsip"
        e.libInit(epCfg)

        // UDP transport (SIP over UDP).
        val tCfg = TransportConfig()
        val portNum = ((config["port"] as? Number)?.toInt()) ?: 5060
        // 0 = ephemeral local port; the remote registrar port is set on the account URI.
        tCfg.port = 0
        e.transportCreate(pjsip_transport_type_e.PJSIP_TRANSPORT_UDP, tCfg)
        e.libStart()

        val server = config["server"] as? String ?: ""
        val username = config["username"] as? String ?: ""
        val authUser = config["authUsername"] as? String ?: username
        val password = config["password"] as? String ?: ""
        val proxy = config["outboundProxy"] as? String
        val expires = ((config["registerExpires"] as? Number)?.toInt()) ?: 300

        val accCfg = AccountConfig()
        accCfg.idUri = "sip:$username@$server:$portNum"
        accCfg.regConfig.registrarUri = "sip:$server:$portNum;transport=udp"
        accCfg.regConfig.timeoutSec = expires.toLong()
        if (!proxy.isNullOrEmpty()) accCfg.sipConfig.proxies.add(proxy)
        // NAT: rport + symmetric RTP so UDP media works behind NAT.
        accCfg.natConfig.iceEnabled = false
        accCfg.mediaConfig.transportConfig.port = 0

        val cred = AuthCredInfo("digest", "*", authUser, 0, password)
        accCfg.sipConfig.authCreds.add(cred)

        val acc = SipAccount(this@ExpoPjsipModule)
        acc.create(accCfg, false)
        this@ExpoPjsipModule.ep = e
        this@ExpoPjsipModule.account = acc
      } catch (t: Throwable) {
        emitError("INIT_FAILED", t.message ?: "initialize failed")
        throw t
      }
    }

    AsyncFunction("register") {
      ensurePjThread()
      val acc = account
      if (acc == null) { emitError("NO_ACCOUNT", "initialize first") }
      else { acc.setRegistration(true); appContext.reactContext?.let { SipForegroundService.start(it) } }
    }
    AsyncFunction("unregister") {
      ensurePjThread()
      account?.setRegistration(false)
      appContext.reactContext?.let { SipForegroundService.stop(it) }
    }

    AsyncFunction("makeCall") { number: String ->
      ensurePjThread()
      val acc = account ?: throw IllegalStateException("Not registered")
      val server = acc.info.uri.substringAfter("@")
      val call = SipCall(this@ExpoPjsipModule, acc)
      val prm = CallOpParam(true)
      call.makeCall("sip:$number@${server.substringBefore(";")}", prm)
      val id = call.callId
      calls[id] = call
      emitCallState(id, "dialing", direction = "outgoing")
      id
    }

    AsyncFunction("answerCall") { callId: String ->
      ensurePjThread()
      calls[callId]?.let {
        val prm = CallOpParam(true); prm.statusCode = pjsip_status_code.PJSIP_SC_OK; it.answer(prm)
      }
    }
    AsyncFunction("rejectCall") { callId: String ->
      ensurePjThread()
      calls[callId]?.let {
        val prm = CallOpParam(true); prm.statusCode = pjsip_status_code.PJSIP_SC_DECLINE; it.hangup(prm)
      }
    }
    AsyncFunction("hangup") { callId: String ->
      ensurePjThread()
      calls[callId]?.let { val prm = CallOpParam(true); it.hangup(prm) }
    }
    AsyncFunction("sendDtmf") { callId: String, digit: String ->
      ensurePjThread()
      calls[callId]?.dialDtmf(digit)
    }
    AsyncFunction("setMute") { callId: String, muted: Boolean ->
      ensurePjThread()
      calls[callId]?.setMuted(muted)
    }
    AsyncFunction("setSpeaker") { enabled: Boolean ->
      // Route audio to speaker/earpiece via AudioManager (handled in SipAudio).
      SipAudio.setSpeaker(appContext.reactContext, enabled)
    }
    Function("getRegistrationState") {
      account?.currentRegState ?: "offline"
    }
    AsyncFunction("destroy") {
      ensurePjThread()
      appContext.reactContext?.let { SipForegroundService.stop(it) }
      tearDown()
    }

    OnDestroy { try { ensurePjThread(); tearDown() } catch (_: Throwable) {} }
  }

  // ---- event helpers (called from SipAccount / SipCall callbacks) ----
  fun emitRegState(state: String, code: Int, reason: String?) =
    sendEvent("onRegState", mapOf("state" to state, "code" to code, "reason" to reason))
  fun emitIncoming(callId: String, remote: String, remoteName: String?) =
    sendEvent("onIncomingCall", mapOf("callId" to callId, "remote" to remote, "remoteName" to remoteName))
  fun emitCallState(callId: String, state: String, code: Int? = null, cause: String? = null, direction: String? = null) =
    sendEvent("onCallState", mapOf("callId" to callId, "state" to state, "code" to code, "cause" to cause, "direction" to direction))
  fun emitError(code: String, message: String) =
    sendEvent("onError", mapOf("code" to code, "message" to message))
  fun registerCall(id: String, call: SipCall) { calls[id] = call }
}
