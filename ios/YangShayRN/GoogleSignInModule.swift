/**
 * GoogleSignInModule · iOS 原生 Google Sign-In SDK + Firebase Auth 桥接
 * - 用官方 GoogleSignIn pod (GIDSignIn v7)，不走 RN wrapper
 * - signIn(): 仅 Google 登录，返回 Google user
 * - signInWithFirebase(): Google 登录 → Firebase credential → Auth.signIn → 返回 Firebase user
 */
import Foundation
import GoogleSignIn
import FirebaseAuth
import React

@objc(GoogleSignInModule)
class GoogleSignInModule: NSObject {
  @objc static func requiresMainQueueSetup() -> Bool {
    return true
  }

  @objc func configure(_ clientID: String) {
    DispatchQueue.main.async {
      GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientID)
    }
  }

  private func rootViewController() -> UIViewController? {
    // RN 0.86 factory 模式是 AppDelegate-based（无 SceneDelegate），
    // window 是 AppDelegate.window 属性，必须从 UIApplication.delegate 取。
    if let window = UIApplication.shared.delegate?.window.flatMap({ $0 }) {
      return window.rootViewController
    }
    // 兜底：scene-based
    if let scene = UIApplication.shared.connectedScenes.first(where: { $0 is UIWindowScene }) as? UIWindowScene {
      return scene.windows.first(where: { $0.isKeyWindow })?.rootViewController ?? scene.windows.first?.rootViewController
    }
    return nil
  }

  /// 仅 Google 登录
  @objc func signIn(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      guard let rootVC = self.rootViewController() else {
        reject("no_vc", "No root view controller", nil)
        return
      }
      GIDSignIn.sharedInstance.signIn(withPresenting: rootVC) { result, error in
        if let error = error {
          reject("signin_failed", error.localizedDescription, error)
          return
        }
        guard let user = result?.user else {
          reject("no_user", "Sign in returned no user", nil)
          return
        }
        resolve([
          "id": user.userID ?? "",
          "email": user.profile?.email ?? "",
          "name": user.profile?.name ?? "",
          "idToken": user.idToken?.tokenString ?? "",
        ] as [String: Any])
      }
    }
  }

  /// Google 登录 → Firebase Auth 包装 → 返回 Firebase user（uid/email/displayName/identityToken）
  @objc func signInWithFirebase(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      guard let rootVC = self.rootViewController() else {
        reject("no_vc", "No root view controller", nil)
        return
      }
      GIDSignIn.sharedInstance.signIn(withPresenting: rootVC) { result, error in
        if let error = error {
          reject("google_failed", error.localizedDescription, error)
          return
        }
        guard let user = result?.user,
              let idToken = user.idToken?.tokenString else {
          reject("no_idtoken", "Google sign in returned no idToken", nil)
          return
        }
        let accessToken = user.accessToken.tokenString
        let credential = GoogleAuthProvider.credential(withIDToken: idToken, accessToken: accessToken)

        Auth.auth().signIn(with: credential) { authResult, error in
          if let error = error {
            reject("firebase_failed", error.localizedDescription, error)
            return
          }
          guard let fbUser = authResult?.user else {
            reject("no_fbuser", "Firebase returned no user", nil)
            return
          }
          // 拿 Firebase identityToken（JWT），和 Apple auth 信息字段对齐
          fbUser.getIDToken { token, _ in
            resolve([
              "uid": fbUser.uid,
              "email": fbUser.email ?? "",
              "displayName": fbUser.displayName ?? "",
              "providerId": "google.com",
              "identityToken": token ?? "",
            ] as [String: Any])
          }
        }
      }
    }
  }
}
