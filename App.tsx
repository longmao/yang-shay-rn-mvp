/**
 * Shay RN MVP · Demo
 * 核心功能：Apple/Google 登录 + 语音输入 STT
 * v1.0 demo：仅验证端到端跑通，不接 Firebase / AI chat / TTS
 */

import React, {useState, useEffect} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  ScrollView,
} from 'react-native';

import {AppleSignInButton} from './src/auth/AppleSignInButton';
import {GoogleSignInButton} from './src/auth/GoogleSignInButton';
import {VoiceInputButton} from './src/voice/VoiceInputButton';
import appleAuth from '@invertase/react-native-apple-authentication';
import {GoogleSignin} from '@react-native-google-signin/google-signin';

type AuthState = {
  signedIn: boolean;
  provider?: 'apple' | 'google';
  userIdentifier?: string;
  email?: string;
};

// Demo debug flag — set to true to auto-trigger Apple Sign in on mount (2s delay)
const AUTO_TRIGGER_APPLE = true;
const AUTO_TRIGGER_GOOGLE = false;

export default function App() {
  const [auth, setAuth] = useState<AuthState>({signedIn: false});
  const [inputText, setInputText] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'ai'; text: string}>>([]);

  // Demo: auto-trigger Apple Sign in / Google Sign in to verify "can be launched"
  useEffect(() => {
    if (AUTO_TRIGGER_APPLE) {
      const t = setTimeout(async () => {
        try {
          // WORKAROUND: this lib v2+ has a bug — JS exposes appleAuth.isSupported only
          // for Android, while iOS native does provide it. Library's performRequest
          // internally checks `!appleAuth.isSupported` and throws "not supported".
          // Workaround: bypass JS wrapper entirely and call native RNAppleAuthModule directly.
          const {NativeModules} = require('react-native');
          const RNAppleAuthModule = NativeModules.RNAppleAuthModule;

          // Build request (same shape as appleAuth.performRequest)
          const appleIdRequest = {
            requestedOperation: 1, // LOGIN
            requestedScopes: [1], // EMAIL
          };
          const cred = await RNAppleAuthModule.performRequest(appleIdRequest);
          Alert.alert('Apple Sign in OK', `user=${cred.user.slice(0, 10)}...`);
        } catch (e: any) {
          Alert.alert('Apple Sign in ERROR', String(e?.message ?? e));
        }
      }, 2000);
      return () => clearTimeout(t);
    }
    if (AUTO_TRIGGER_GOOGLE) {
      const t = setTimeout(async () => {
        try {
          console.log('[demo] auto-trigger Google Sign in');
          await GoogleSignin.signIn();
        } catch (e) {
          console.log('[demo] Google Sign in auto-trigger error:', e);
        }
      }, 2000);
      return () => clearTimeout(t);
    }
  }, []);

  // 登录成功回调
  const handleAuthSuccess = (provider: 'apple' | 'google', userInfo: {identifier: string; email?: string}) => {
    setAuth({signedIn: true, provider, userIdentifier: userInfo.identifier, email: userInfo.email});
  };

  // 登录失败回调
  const handleAuthError = (provider: 'apple' | 'google', error: Error) => {
    Alert.alert(`${provider === 'apple' ? 'Apple' : 'Google'} Sign in failed`, error.message);
  };

  // 语音输入回调（partial / final 结果）
  const handleVoicePartial = (text: string) => {
    setInputText(text); // 实时显示部分识别结果
  };

  const handleVoiceFinal = (text: string) => {
    setInputText(text); // 最终结果填入输入框
  };

  // 发送按钮：把输入框内容作为用户消息
  const handleSend = () => {
    if (!inputText.trim()) {
      return;
    }
    const userMessage = inputText.trim();
    setChatHistory(prev => [...prev, {role: 'user', text: userMessage}]);

    // Demo 简化：AI 回复 = mock 文本（v1.0 不接 LLM）
    setTimeout(() => {
      const aiReply = `I heard: "${userMessage}". (Demo: AI chat not connected yet)`;
      setChatHistory(prev => [...prev, {role: 'ai', text: aiReply}]);
    }, 500);

    setInputText('');
  };

  // ===== Login 屏 =====
  if (!auth.signedIn) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loginContainer}>
          <Text style={styles.title}>Shay RN MVP</Text>
          <Text style={styles.subtitle}>Sign in to start chatting</Text>
          <View style={styles.buttonGroup}>
            <AppleSignInButton
              onSuccess={info => handleAuthSuccess('apple', info)}
              onError={err => handleAuthError('apple', err)}
            />
            <View style={{height: 12}} />
            <GoogleSignInButton
              onSuccess={info => handleAuthSuccess('google', info)}
              onError={err => handleAuthError('google', err)}
            />
          </View>
          <Text style={styles.note}>Demo version · Not connected to backend</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ===== Chat 屏 =====
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shay RN MVP</Text>
        <Text style={styles.headerSubtitle}>
          Signed in via {auth.provider} · {auth.email || auth.userIdentifier?.slice(0, 12)}
        </Text>
      </View>

      <ScrollView style={styles.chatArea} contentContainerStyle={styles.chatContent}>
        {chatHistory.length === 0 && (
          <Text style={styles.placeholder}>
            Tap the mic button below to speak.{'\n'}
            Demo: your voice → text → mock AI reply
          </Text>
        )}
        {chatHistory.map((msg, idx) => (
          <View
            key={idx}
            style={[
              styles.messageBubble,
              msg.role === 'user' ? styles.userBubble : styles.aiBubble,
            ]}>
            <Text style={styles.messageRole}>{msg.role === 'user' ? 'You' : 'Shay'}</Text>
            <Text style={styles.messageText}>{msg.text}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputArea}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type or tap mic to speak..."
          multiline
          editable
        />
        <VoiceInputButton
          onPartial={handleVoicePartial}
          onFinal={handleVoiceFinal}
          locale="en-US"
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim()}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#fff'},
  loginContainer: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24},
  title: {fontSize: 32, fontWeight: '700', marginBottom: 8, color: '#1a1a1a'},
  subtitle: {fontSize: 16, color: '#666', marginBottom: 32},
  buttonGroup: {width: '100%', maxWidth: 320, marginBottom: 24},
  note: {fontSize: 12, color: '#999', marginTop: 16},
  header: {padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee'},
  headerTitle: {fontSize: 20, fontWeight: '700', color: '#1a1a1a'},
  headerSubtitle: {fontSize: 12, color: '#666', marginTop: 4},
  chatArea: {flex: 1},
  chatContent: {padding: 16, gap: 12},
  placeholder: {color: '#999', textAlign: 'center', marginTop: 32, lineHeight: 22},
  messageBubble: {padding: 12, borderRadius: 12, maxWidth: '80%'},
  userBubble: {backgroundColor: '#007AFF', alignSelf: 'flex-end'},
  aiBubble: {backgroundColor: '#f0f0f0', alignSelf: 'flex-start'},
  messageRole: {fontSize: 10, color: '#666', marginBottom: 4, fontWeight: '600'},
  messageText: {fontSize: 15, color: '#1a1a1a'},
  inputArea: {flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1, borderTopColor: '#eee', gap: 8},
  input: {flex: 1, minHeight: 40, maxHeight: 120, padding: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, fontSize: 15, backgroundColor: '#fafafa'},
  sendButton: {paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#007AFF', borderRadius: 8},
  sendButtonDisabled: {backgroundColor: '#ccc'},
  sendButtonText: {color: '#fff', fontWeight: '600', fontSize: 14},
});