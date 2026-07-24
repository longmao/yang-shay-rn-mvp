/**
 * Voice Input Button · @react-native-voice/voice 包装
 * - 按下：start(locale='en-US') 启动 iOS SFSpeechRecognizer
 * - 实时：onSpeechPartialResults 回调 partial result
 * - 松开：stop() + onSpeechResults 回调 final result
 */

import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View, PermissionsAndroid, Platform} from 'react-native';
import Voice, {
  SpeechErrorEvent,
  SpeechResultsEvent,
  SpeechStartEvent,
} from '@react-native-voice/voice';

type Props = {
  onPartial: (text: string) => void;
  onFinal: (text: string) => void;
  locale?: string;
};

export function VoiceInputButton({onPartial, onFinal, locale = 'en-US'}: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [partialText, setPartialText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 注册 Voice 事件监听器
    Voice.onSpeechStart = onSpeechStart;
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechError = onSpeechError;
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechPartialResults = onSpeechPartialResults;
    Voice.onSpeechVolumeChanged = onSpeechVolumeChanged;

    return () => {
      // 清理
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  function onSpeechStart(_e: SpeechStartEvent) {
    setError(null);
  }

  function onSpeechEnd(_e: any) {
    setIsRecording(false);
  }

  function onSpeechError(e: SpeechErrorEvent) {
    setError(e.error?.message ?? 'Voice recognition error');
    setIsRecording(false);
  }

  function onSpeechResults(e: SpeechResultsEvent) {
    if (e.value && e.value.length > 0) {
      const text = e.value[0];
      onFinal(text);
      setPartialText('');
    }
  }

  function onSpeechPartialResults(e: any) {
    if (e.value && e.value.length > 0) {
      const text = e.value[0];
      setPartialText(text);
      onPartial(text);
    }
  }

  function onSpeechVolumeChanged(_e: any) {
    // 可以用来做波形动画（demo 简化：不做）
  }

  // 开始录音
  async function startRecording() {
    try {
      setError(null);
      setPartialText('');

      // iOS 上 Voice 库会自动请求权限；Android 上需要手动请求
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'Shay RN MVP needs microphone access for voice input.',
            buttonPositive: 'OK',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          setError('Microphone permission denied');
          return;
        }
      }

      await Voice.start(locale);
      setIsRecording(true);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to start voice recognition');
    }
  }

  // 停止录音
  async function stopRecording() {
    try {
      await Voice.stop();
    } catch (err: any) {
      // silent
    }
    setIsRecording(false);
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, isRecording && styles.buttonRecording]}
        onPressIn={startRecording}
        onPressOut={stopRecording}
        activeOpacity={0.8}>
        <Text style={styles.icon}>{isRecording ? '🔴' : '🎙️'}</Text>
      </TouchableOpacity>
      {partialText ? (
        <Text style={styles.partial} numberOfLines={1}>
          {partialText}
        </Text>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {alignItems: 'center'},
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonRecording: {backgroundColor: '#FF3B30', transform: [{scale: 1.1}]},
  icon: {fontSize: 22},
  partial: {fontSize: 11, color: '#666', marginTop: 4, maxWidth: 80},
  error: {fontSize: 10, color: 'red', marginTop: 4, maxWidth: 80},
});