#import "PjsipEngine.h"
// Requires the vendored PJSIP xcframework (see PJSIP_SETUP.md). Uncomment once
// the headers/libs are on the header search path:
// #import <pjsua-lib/pjsua.h>

// The pjsua callbacks are C functions; they resolve the shared engine instance
// and forward into the Obj-C blocks. This file is compiled as Obj-C++ (.mm).

static PjsipEngine *gEngine = nil;

@implementation PjsipEngine {
  // pjsua_acc_id _accId; NSMutableDictionary<NSNumber*,NSString*> *_callIds;
}

- (instancetype)init {
  if (self = [super init]) { gEngine = self; /* _callIds = [NSMutableDictionary new]; */ }
  return self;
}

- (BOOL)initialize:(NSDictionary *)config error:(NSError **)error {
  // pjsua_create();
  // pjsua_config cfg; pjsua_config_default(&cfg);
  //   cfg.cb.on_reg_state2   = &on_reg_state;
  //   cfg.cb.on_incoming_call= &on_incoming_call;
  //   cfg.cb.on_call_state   = &on_call_state;
  //   cfg.cb.on_call_media_state = &on_call_media_state;
  // pjsua_media_config mcfg; pjsua_media_config_default(&mcfg);
  // pjsua_init(&cfg, NULL, &mcfg);
  //
  // // UDP transport (SIP over UDP)
  // pjsua_transport_config tcfg; pjsua_transport_config_default(&tcfg); tcfg.port = 0;
  // pjsua_transport_create(PJSIP_TRANSPORT_UDP, &tcfg, NULL);
  // pjsua_start();
  //
  // NSString *server = config[@"server"]; int port = [config[@"port"] intValue] ?: 5060;
  // NSString *user = config[@"username"]; NSString *pass = config[@"password"];
  // NSString *authUser = config[@"authUsername"] ?: user;
  // pjsua_acc_config acfg; pjsua_acc_config_default(&acfg);
  //   acfg.id  = pj_str(...sip:user@server:port...);
  //   acfg.reg_uri = pj_str(...sip:server:port;transport=udp...);
  //   acfg.cred_count = 1;
  //   acfg.cred_info[0].realm = pj_str("*");
  //   acfg.cred_info[0].scheme = pj_str("digest");
  //   acfg.cred_info[0].username = pj_str(authUser);
  //   acfg.cred_info[0].data = pj_str(pass);
  //   // NAT: symmetric RTP for UDP media
  //   acfg.allow_contact_rewrite = PJ_TRUE;
  //   acfg.media_stun_use = PJSUA_STUN_USE_DEFAULT;
  // pjsua_acc_add(&acfg, PJ_FALSE /* not default reg */, &_accId);
  return YES;
}

- (BOOL)registerAccount:(NSError **)error { /* pjsua_acc_set_registration(_accId, PJ_TRUE); */ return YES; }
- (BOOL)unregister:(NSError **)error      { /* pjsua_acc_set_registration(_accId, PJ_FALSE); */ return YES; }

- (nullable NSString *)makeCall:(NSString *)number error:(NSError **)error {
  // pjsua_call_id cid; pj_str_t uri = pj_str(...sip:number@server...);
  // pjsua_call_make_call(_accId, &uri, NULL, NULL, NULL, &cid);
  // NSString *callId = [NSUUID UUID].UUIDString; _callIds[@(cid)] = callId; return callId;
  return [NSUUID UUID].UUIDString;
}

- (BOOL)answer:(NSString *)callId error:(NSError **)error { /* pjsua_call_answer(cid, 200, ...) */ return YES; }
- (BOOL)reject:(NSString *)callId error:(NSError **)error { /* pjsua_call_answer(cid, 603, ...) */ return YES; }
- (BOOL)hangup:(NSString *)callId error:(NSError **)error { /* pjsua_call_hangup(cid, 0, ...) */ return YES; }
- (BOOL)sendDtmf:(NSString *)callId digit:(NSString *)digit error:(NSError **)error { /* pjsua_call_dial_dtmf */ return YES; }
- (BOOL)setMute:(NSString *)callId muted:(BOOL)muted error:(NSError **)error { /* pjsua_conf_adjust_tx_level / disconnect ports */ return YES; }

- (void)setSpeaker:(BOOL)enabled {
  // AVAudioSession override: overrideOutputAudioPort speaker/none.
}

- (NSString *)registrationState { return @"offline"; }
- (void)destroy { /* pjsua_destroy(); */ gEngine = nil; }

@end
