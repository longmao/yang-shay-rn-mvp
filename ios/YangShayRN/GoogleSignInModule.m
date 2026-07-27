//
//  GoogleSignInModule.m
//  ObjC 桥接：让 RN bridge 发现 Swift 的 GoogleSignInModule + 方法
//
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(GoogleSignInModule, NSObject)

RCT_EXTERN_METHOD(configure:(NSString *)clientID)

RCT_EXTERN_METHOD(signIn:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(signInWithFirebase:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
