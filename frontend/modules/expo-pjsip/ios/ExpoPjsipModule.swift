import ExpoModulesCore

// Native SIP/UDP engine (PJSIP) for iOS. Signaling UDP, media RTP. Telephony
// only — never touches the wallet or any HTTPS API credential.
//
// PJSIP on iOS is a C library (pjsua). This module drives it through PjsipEngine
// (an Obj-C++ / C bridge) so the pjsua calls stay out of Swift. The PJSIP
// xcframework + bridging header must be vendored — see PJSIP_SETUP.md. The
// Swift <-> native events use the Expo Modules `Events` channel.
public class ExpoPjsipModule: Module {
  private let engine = PjsipEngine()

  public func definition() -> ModuleDefinition {
    Name("ExpoPjsip")

    Events("onRegState", "onIncomingCall", "onCallState", "onDtmf", "onAudioState", "onError")

    OnCreate {
      // Forward engine callbacks to JS.
      engine.onRegState = { [weak self] state, code, reason in
        self?.sendEvent("onRegState", ["state": state, "code": code, "reason": reason as Any])
      }
      engine.onIncomingCall = { [weak self] callId, remote, name in
        self?.sendEvent("onIncomingCall", ["callId": callId, "remote": remote, "remoteName": name as Any])
      }
      engine.onCallState = { [weak self] callId, state, code, cause, dir in
        self?.sendEvent("onCallState", [
          "callId": callId, "state": state, "code": code as Any, "cause": cause as Any, "direction": dir as Any
        ])
      }
      engine.onError = { [weak self] code, message in
        self?.sendEvent("onError", ["code": code, "message": message])
      }
    }

    AsyncFunction("initialize") { (config: [String: Any]) in
      try self.engine.initialize(config)   // creates endpoint + UDP transport + account
    }
    AsyncFunction("register") { try self.engine.register() }
    AsyncFunction("unregister") { try self.engine.unregister() }
    AsyncFunction("makeCall") { (number: String) -> String in
      return try self.engine.makeCall(number)
    }
    AsyncFunction("answerCall") { (callId: String) in try self.engine.answer(callId) }
    AsyncFunction("rejectCall") { (callId: String) in try self.engine.reject(callId) }
    AsyncFunction("hangup") { (callId: String) in try self.engine.hangup(callId) }
    AsyncFunction("sendDtmf") { (callId: String, digit: String) in try self.engine.sendDtmf(callId, digit) }
    AsyncFunction("setMute") { (callId: String, muted: Bool) in try self.engine.setMute(callId, muted) }
    AsyncFunction("setSpeaker") { (enabled: Bool) in self.engine.setSpeaker(enabled) }
    Function("getRegistrationState") { () -> String in return self.engine.registrationState() }
    AsyncFunction("destroy") { self.engine.destroy() }

    OnDestroy { self.engine.destroy() }
  }
}
