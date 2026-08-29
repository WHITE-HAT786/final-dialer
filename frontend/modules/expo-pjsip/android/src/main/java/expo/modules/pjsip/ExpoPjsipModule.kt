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
  // Identity (sip:user@server:port) the current account was created for. Used to
  // make initialize() idempotent so a repeated connect for the SAME line does not
  // destroy + recreate the account (which caused register/unregister churn).
  private var currentIdUri: String? = null
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
      currentIdUri = null
    } catch (_: Throwable) {}
  }

  override fun definition() = ModuleDefinition {
    Name("ExpoPjsip")

    Events(
      "onRegState", "onIncomingCall", "onCallState", "onDtmf", "onAudioState", "onError"
    )

    AsyncFunction("initialize") { config: Map<String, Any?> ->
      try {
        val server = config["server"] as? String ?: ""
        val username = config["username"] as? String ?: ""
        val portNum = ((config["port"] as? Number)?.toInt()) ?: 5060
        val newIdUri = "sip:$username@$server:$portNum"

        // IDEMPOTENT: if the SAME line is already up and registered/registering,
        // do NOT tear the stack down and rebuild it — that produced
        // REGISTER -> unregister -> account=null churn. Reuse it (re-register if
        // it had dropped) and return.
        if (ep != null && account != null && currentIdUri == newIdUri) {
          val st = account?.currentRegState
          if (st == "registered" || st == "registering") return@AsyncFunction
          try { account?.setRegistration(true); return@AsyncFunction } catch (_: Throwable) {}
        }

        if (ep != null) tearDown()   // different identity / dead stack -> rebuild
        System.loadLibrary("pjsua2")
        val e = Endpoint()
        e.libCreate()
        val epCfg = EpConfig()
        epCfg.uaConfig.userAgent = "DepthRouteMobile/1.0 pjsip"
        e.libInit(epCfg)

        // UDP transport (SIP over UDP).
        val tCfg = TransportConfig()
        // 0 = ephemeral local port; the remote registrar port is set on the account URI.
        tCfg.port = 0
        e.transportCreate(pjsip_transport_type_e.PJSIP_TRANSPORT_UDP, tCfg)
        e.libStart()

        val authUser = config["authUsername"] as? String ?: username
        val password = config["password"] as? String ?: ""
        val proxy = config["outboundProxy"] as? String
        val expires = ((config["registerExpires"] as? Number)?.toInt()) ?: 300

        val accCfg = AccountConfig()
        accCfg.idUri = newIdUri
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
        this@ExpoPjsipModule.currentIdUri = newIdUri
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
    // Real SIP hold/resume via re-INVITE (pjsua2 setHold / reinvite UNHOLD).
    AsyncFunction("setHold") { callId: String, hold: Boolean ->
      ensurePjThread()
      calls[callId]?.let {
        val prm = CallOpParam(true)
        if (hold) {
          it.setHold(prm)
        } else {
          prm.opt.flag = pjsua_call_flag.PJSUA_CALL_UNHOLD.toLong()
          it.reinvite(prm)
        }
      }
    }
    // Blind transfer via SIP REFER.
    AsyncFunction("transfer") { callId: String, dest: String ->
      ensurePjThread()
      val acc = account ?: return@AsyncFunction false
      val server = acc.info.uri.substringAfter("@").substringBefore(";")
      val uri = if (dest.startsWith("sip:")) dest else "sip:$dest@$server"
      calls[callId]?.xfer(uri, CallOpParam(true))
      true
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
