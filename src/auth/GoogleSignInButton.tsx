/**
 * Google Sign in Button · RN 自定义按钮（Google 没提供 iOS 原生按钮 SDK）
 * - 严格遵循 Google Brand Guidelines（白底 + Google logo + "Sign in with Google"）
 * - 点击后调 GoogleSignin.signIn() 唤起 iOS Google Sign In sheet
 */

import React from 'react';
import {Alert, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {GoogleSignin} from '@react-native-google-signin/google-signin';

export type GoogleUserInfo = {
  identifier: string;
  email?: string;
  name?: string;
  idToken?: string;
};

type Props = {
  onSuccess: (info: GoogleUserInfo) => void;
  onError: (error: Error) => void;
};

export function GoogleSignInButton({onSuccess, onError}: Props) {
  const handlePress = async () => {
    try {
      // 1. 检查 Google Play Services（iOS 上一般无影响，但保留 API 完整性）
      await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});

      // 2. 唤起 Google Sign In 原生 sheet
      const userInfo = await GoogleSignin.signIn();

      // 3. 提取用户信息
      const info: GoogleUserInfo = {
        identifier: userInfo.user.id,
        email: userInfo.user.email,
        name: userInfo.user.name ?? undefined,
        idToken: userInfo.idToken ?? undefined,
      };

      onSuccess(info);
    } catch (err: any) {
      // 用户取消是正常操作
      if (err?.code === 'SIGN_IN_CANCELLED') {
        return;
      }
      onError(err as Error);
    }
  };

  // RN 自定义按钮（Google 官方 Brand Guidelines）
  return (
    <TouchableOpacity style={styles.button} onPress={handlePress} activeOpacity={0.8}>
      <View style={styles.buttonContent}>
        <Text style={styles.logo}>G</Text>
        <Text style={styles.text}>Sign in with Google</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#fff',
    borderColor: '#dadce0',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonContent: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12},
  logo: {fontSize: 18, fontWeight: '700', color: '#4285F4'},
  text: {fontSize: 15, color: '#1a1a1a', fontWeight: '500'},
});