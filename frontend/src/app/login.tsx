import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';

// Warna ombre per huruf, dari #94BE56 ke #7080B4
function OmbreText({ text, style }: { text: string; style: any }) {
  const from = [0x94, 0xbe, 0x56];
  const to = [0x70, 0x80, 0xb4];
  const last = Math.max(text.length - 1, 1);

  return (
    <Text style={style}>
      {text.split('').map((ch, i) => {
        const t = i / last;
        const c = from.map((f, k) => Math.round(f + (to[k] - f) * t));
        return (
          <Text key={i} style={{ color: `rgb(${c[0]}, ${c[1]}, ${c[2]})` }}>
            {ch}
          </Text>
        );
      })}
    </Text>
  );
}

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Oops', 'Email dan kata sandi harus diisi.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (error) {
      Alert.alert('Gagal masuk', 'Email atau kata sandi salah.');
      return;
    }
    router.replace('/home');
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
            
        <Animated.View entering={FadeInDown.duration(600)} style={styles.center}>
          <Image
            source={require('@/assets/images/logo-login.svg')}
            style={{ width: 600, height: 250 }}
            contentFit="contain"
          />

          <OmbreText text="Selamat Datang!" style={styles.title} />
          <Text style={styles.subtitle}>
            Masuk dulu yuk, biar bisa langsung racik menu{'\n'}lezat dari isi kulkasmu hari ini!
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(600)}>
          {/* Email */}
          <TextInput
            style={styles.input}
            placeholder="Email Aktif"
            placeholderTextColor="#A0A0A0"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          {/* Kata sandi + ikon mata */}
          <View style={styles.passwordWrap}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Kata Sandi"
              placeholderTextColor="#A0A0A0"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eye}
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={10}>
              <Ionicons
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color="#6B6B6B"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => router.push('/forgot-password')}>
            <Text style={styles.link}>Lupa kata sandi?</Text>
          </TouchableOpacity>

          {/* Tombol masuk */}
          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.7 }]}
            activeOpacity={0.85}
            onPress={handleLogin}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Masuk!</Text>
            )}
          </TouchableOpacity>

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Bukan member? </Text>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text style={styles.link}>Daftar sekarang.</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#FFFFFF' },
  container: {
    flexGrow: 1,
    paddingHorizontal: 27,
    paddingTop: 90,
    paddingBottom: 30,
  },
  center: { alignItems: 'center' },
  logo: { width: 180, height: 180 },
  title: { fontSize: 24, fontWeight: '700', marginTop: 16 },
  subtitle: {
    marginTop: 10,
    marginBottom: 28,
    fontSize: 12,
    lineHeight: 18,
    color: '#444444',
    textAlign: 'center',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#D5D5D5',
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#111111',
    backgroundColor: '#FFFFFF',
    marginBottom: 14,
  },
  passwordWrap: { justifyContent: 'center' },
  passwordInput: { paddingRight: 48 },
  eye: { position: 'absolute', right: 16, top: 15 },
  link: { color: '#6B7FA6', fontSize: 12, fontWeight: '700' },
  button: {
    marginTop: 26,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#8DB84A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 22,
  },
  registerText: { fontSize: 12, color: '#555555' },
});