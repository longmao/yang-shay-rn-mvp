/**
 * Google Sign in Button · RN 自定义按钮
 * - 调自写 iOS 原生 native module（GoogleSignInModule.swift → GIDSignIn SDK v7）
 * - 不走 RN wrapper（绕开 RN 0.86 codegen 问题）
 */

import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View, NativeModules} from 'react-native';

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
      const result = (await NativeModules.GoogleSignInModule.signIn()) as Record<string, string>;
      const info: GoogleUserInfo = {
        identifier: result.id,
        email: result.email || undefined,
        name: result.name || undefined,
        idToken: result.idToken || undefined,
      };
      onSuccess(info);
    } catch (err: any) {
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
