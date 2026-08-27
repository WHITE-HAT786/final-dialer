#import <Foundation/Foundation.h>

// Obj-C bridge around the PJSIP `pjsua` C API. The .mm implementation includes
// <pjsua-lib/pjsua.h> from the vendored PJSIP xcframework (see PJSIP_SETUP.md).
NS_ASSUME_NONNULL_BEGIN

@interface PjsipEngine : NSObject

@property (nonatomic, copy, nullable) void (^onRegState)(NSString *state, NSInteger code, NSString * _Nullable reason);
@property (nonatomic, copy, nullable) void (^onIncomingCall)(NSString *callId, NSString *remote, NSString * _Nullable name);
@property (nonatomic, copy, nullable) void (^onCallState)(NSString *callId, NSString *state, NSInteger code, NSString * _Nullable cause, NSString * _Nullable direction);
@property (nonatomic, copy, nullable) void (^onError)(NSString *code, NSString *message);

- (BOOL)initialize:(NSDictionary *)config error:(NSError **)error;   // endpoint + UDP transport + account
- (BOOL)registerAccount:(NSError **)error;
- (BOOL)unregister:(NSError **)error;
- (nullable NSString *)makeCall:(NSString *)number error:(NSError **)error;
- (BOOL)answer:(NSString *)callId error:(NSError **)error;
- (BOOL)reject:(NSString *)callId error:(NSError **)error;
- (BOOL)hangup:(NSString *)callId error:(NSError **)error;
- (BOOL)sendDtmf:(NSString *)callId digit:(NSString *)digit error:(NSError **)error;
- (BOOL)setMute:(NSString *)callId muted:(BOOL)muted error:(NSError **)error;
- (void)setSpeaker:(BOOL)enabled;
- (NSString *)registrationState;
- (void)destroy;

@end

NS_ASSUME_NONNULL_END
