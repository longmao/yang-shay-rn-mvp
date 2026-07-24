/**
 * Apple Sign in Button
 * - Bypass @invertase/react-native-apple-authentication AppleButton 组件（库 bug：JS 拼接
 *   字符串 'BLACKSIGN_IN' 与 iOS native 类名 'BlackSignIn' 不匹配导致 view config not found）
 * - 直接调 performSignIn API（系统原生 Authorization sheet 完全工作）
 * - 用 RN TouchableOpacity 自定义按钮 UI（视觉模仿 Apple HIG：黑底 + 白字 +  文字）
 * - 接受 Apple Review Guideline 4.0 拒审风险（demo 阶段权宜；v1.1 可用 expo-apple-authentication 替代）
 */

import React from 'react';
import {Alert, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
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
      // lib v2+ native API is `performRequest`; fall back to `performSignIn` for older versions
      const fn = (appleAuth as any).performRequest || appleAuth.performSignIn;
      const appleCred = await fn({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });

      const info: AppleUserInfo = {
        identifier: appleCred.user,
        email: appleCred.email ?? undefined,
        fullName: appleCred.fullName
          ? [appleCred.fullName.givenName, appleCred.fullName.familyName].filter(Boolean).join(' ')
          : undefined,
        identityToken: appleCred.identityToken ?? undefined,
      };

      onSuccess(info);
    } catch (err: any) {
      if (err?.code === appleAuth.Error.CANCELED) {
        return;
      }
      onError(err as Error);
    }
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handlePress} activeOpacity={0.8}>
      <View style={styles.content}>
        <Text style={styles.appleIcon}></Text>
        <Text style={styles.text}>Sign in with Apple</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#000',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 48,
    justifyContent: 'center',
  },
  content: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8},
  appleIcon: {fontSize: 18, color: '#fff', fontWeight: '700'},
  text: {fontSize: 15, color: '#fff', fontWeight: '600'},
});