/**
 * Apple Sign in Button · 使用 AppleAuthenticationButton（系统原生控件）
 * - 100% 符合 Apple HIG 4.0 + App Review Guideline 4.0
 * - 点击后调 performSignIn 唤起 iOS 系统原生 Authorization sheet
 */

import React from 'react';
import {Alert} from 'react-native';
import {
  AppleAuthenticationButton,
  AppleAuthenticationButtonType,
  AppleAuthenticationButtonStyle,
} from '@invertase/react-native-apple-authentication';
import appleAuth from '@invertase/react-native-apple-authentication';

export type AppleUserInfo = {
  identifier: string;
  email?: string;
  fullName?: string;
  identityToken?: string;
};

type Props = {
  onSuccess: (info: AppleUserInfo) => void;
  onError: (error: Error) => void;
};

export function AppleSignInButton({onSuccess, onError}: Props) {
  const handlePress = async () => {
    try {
      // 1. 调 Apple 系统原生 Authorization sheet
      const appleCred = await appleAuth.performSignIn({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });

      // 2. 提取用户信息
      const info: AppleUserInfo = {
        identifier: appleCred.user,
        email: appleCred.email ?? undefined,
        fullName: appleCred.fullName
          ? [appleCred.fullName.givenName, appleCred.fullName.familyName].filter(Boolean).join(' ')
          : undefined,
        identityToken: appleCred.identityToken ?? undefined,
      };

      // 3. 触发成功回调（demo 简化：不接 Firebase Auth）
      onSuccess(info);
    } catch (err: any) {
      // 用户取消是正常操作，不算 error
      if (err?.code === appleAuth.Error.CANCELED) {
        // silent: no Alert
        return;
      }
      onError(err as Error);
    }
  };

  return (
    <AppleAuthenticationButton
      buttonType={AppleAuthenticationButtonType.SIGN_IN}
      buttonStyle={AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={8}
      onPress={handlePress}
    />
  );
}