import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ComponentRef, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';

// ====== SESUAIKAN DENGAN FASTAPI-MU ======
const VERIFY_ENDPOINT = '/api/auth/verify-otp'; // body: { email, otp }
const RESEND_ENDPOINT = '/api/auth/resend-otp'; // body: { email }
const OTP_LENGTH = 4;
const RESEND_SECONDS = 60;
// ==========================================

export default function Otp() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);

  // Hitung mundur untuk "Kirim ulang kode"
  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  // Buka keyboard otomatis
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, []);

  const handleVerify = async () => {
    if (code.length !== OTP_LENGTH) return;

    setLoading(true);
    try {
      const res: any = await api(VERIFY_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify({ email, otp: code }),
      });

      // Kalau FastAPI mengembalikan token Supabase, simpan sebagai sesi login
      if (res?.access_token && res?.refresh_token) {
        await supabase.auth.setSession({
          access_token: res.access_token,
          refresh_token: res.refresh_token,
        });
      }

      router.replace('/home');
    } catch (e: any) {
      Alert.alert('Kode salah', e.message || 'Kode verifikasi tidak valid.');
      setCode('');
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (seconds > 0) return;
    try {
      await api(RESEND_ENDPOINT, { method: 'POST', body: JSON.stringify({ email }) });
      setSeconds(RESEND_SECONDS);
      setCode('');
      Alert.alert('Terkirim', 'Kode baru sudah dikirim ke emailmu.');
    } catch (e: any) {
      Alert.alert('Gagal kirim ulang', e.message);
    }
  };

  const ready = code.length === OTP_LENGTH && !loading;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="dark" />

      <View>
        <Text style={styles.title}>Masukkan Kode Verifikasi</Text>
        <Text style={styles.subtitle}>
          Kode {OTP_LENGTH} digit telah berhasil dikirim ke{'\n'}
          {email}
        </Text>

        {/* 4 kotak kode */}
        <Pressable style={styles.boxes} onPress={() => inputRef.current?.focus()}>
          {Array.from({ length: OTP_LENGTH }).map((_, i) => {
            const active = i === Math.min(code.length, OTP_LENGTH - 1);
            return (
              <View key={i} style={[styles.box, active && styles.boxActive]}>
                <Text style={styles.boxText}>{code[i] ?? ''}</Text>
              </View>
            );
          })}
        </Pressable>

        {/* Input asli disembunyikan, hanya untuk menangkap ketikan */}
        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={(t) => setCode(t.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH))}
          keyboardType="number-pad"
          maxLength={OTP_LENGTH}
          style={styles.hidden}
          autoComplete="sms-otp"
          textContentType="oneTimeCode"
        />
      </View>

      <View>
        <TouchableOpacity onPress={handleResend} disabled={seconds > 0} style={styles.resend}>
          <Text style={[styles.resendText, seconds > 0 && { opacity: 0.5 }]}>
            {seconds > 0 ? `Kirim ulang kode (${seconds}s)` : 'Kirim ulang kode'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, !ready && { opacity: 0.5 }]}
          activeOpacity={0.85}
          onPress={handleVerify}
          disabled={!ready}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Lanjutkan</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 27,
    paddingTop: 110,
    paddingBottom: 20,
    justifyContent: 'space-between',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#111111', textAlign: 'center' },
  subtitle: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
    color: '#555555',
    textAlign: 'center',
  },
  boxes: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 36 },
  box: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D5D5D5',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  boxActive: { borderColor: '#8DB84A', borderWidth: 1.5 },
  boxText: { fontSize: 20, fontWeight: '700', color: '#111111' },
  hidden: { position: 'absolute', opacity: 0, height: 1, width: 1 },
  resend: { alignSelf: 'center', marginBottom: 18, padding: 6 },
  resendText: { fontSize: 12, fontWeight: '700', color: '#6B7FA6' },
  button: {
    height: 50,
    borderRadius: 14,
    backgroundColor: '#8DB84A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});