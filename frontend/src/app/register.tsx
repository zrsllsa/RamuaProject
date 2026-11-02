import { Ionicons } from '@expo/vector-icons';
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
import { api } from '@/lib/api';

// ====== SESUAIKAN DENGAN FASTAPI-MU ======
const REGISTER_ENDPOINT = '/api/auth/register'; // endpoint daftar (FastAPI kirim OTP ke email)
// ==========================================

type FieldName = 'nama' | 'email' | 'password' | 'ulangi';

export default function Register() {
  const router = useRouter();

  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ulangi, setUlangi] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showUlangi, setShowUlangi] = useState(false);
  const [agree, setAgree] = useState(false);
  const [focus, setFocus] = useState<FieldName | null>(null);
  const [loading, setLoading] = useState(false);

  const inputStyle = (name: FieldName) => [styles.input, focus === name && styles.inputFocus];

  const handleRegister = async () => {
    if (!nama.trim() || !email.trim() || !password || !ulangi) {
      Alert.alert('Oops', 'Semua kolom harus diisi.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      Alert.alert('Oops', 'Format email belum benar.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Oops', 'Kata sandi minimal 6 karakter.');
      return;
    }
    if (password !== ulangi) {
      Alert.alert('Oops', 'Kata sandi dan ulangi kata sandi tidak sama.');
      return;
    }
    if (!agree) {
      Alert.alert('Oops', 'Centang persetujuan Terms and Conditions dulu ya.');
      return;
    }

    setLoading(true);
    try {
      // FastAPI: simpan data user + kirim kode OTP ke email
      await api(REGISTER_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify({
          nama_panggilan: nama.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      // Berhasil -> halaman OTP
      router.push({ pathname: '/otp', params: { email: email.trim().toLowerCase() } });
    } catch (e: any) {
      Alert.alert('Gagal daftar', e.message);
    } finally {
      setLoading(false);
    }
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
        <Animated.View entering={FadeInDown.duration(500)}>
          <Text style={styles.title}>Bikin Akun Baru!</Text>
          <Text style={styles.subtitle}>Cuma butuh semenit kok! Buat akumu sekarang.</Text>

          <Text style={styles.label}>Nama Panggilan</Text>
          <TextInput
            style={inputStyle('nama')}
            value={nama}
            onChangeText={setNama}
            onFocus={() => setFocus('nama')}
            onBlur={() => setFocus(null)}
            placeholder="Nama panggilanmu"
            placeholderTextColor="#A0A0A0"
          />

          <Text style={styles.label}>Email Aktif</Text>
          <TextInput
            style={inputStyle('email')}
            value={email}
            onChangeText={setEmail}
            onFocus={() => setFocus('email')}
            onBlur={() => setFocus(null)}
            placeholder="name@email.com"
            placeholderTextColor="#A0A0A0"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          <Text style={styles.label}>Kata Sandi</Text>
          <View style={styles.passwordWrap}>
            <TextInput
              style={[...inputStyle('password'), styles.passwordInput]}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setFocus('password')}
              onBlur={() => setFocus(null)}
              placeholder="Buat kata sandi"
              placeholderTextColor="#A0A0A0"
              secureTextEntry={!showPass}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.eye} onPress={() => setShowPass((v) => !v)} hitSlop={10}>
              <Ionicons name={showPass ? 'eye-outline' : 'eye-off-outline'} size={20} color="#6B6B6B" />
            </TouchableOpacity>
          </View>

          <View style={styles.passwordWrap}>
            <TextInput
              style={[...inputStyle('ulangi'), styles.passwordInput]}
              value={ulangi}
              onChangeText={setUlangi}
              onFocus={() => setFocus('ulangi')}
              onBlur={() => setFocus(null)}
              placeholder="Ulangi kata sandi"
              placeholderTextColor="#A0A0A0"
              secureTextEntry={!showUlangi}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.eye} onPress={() => setShowUlangi((v) => !v)} hitSlop={10}>
              <Ionicons name={showUlangi ? 'eye-outline' : 'eye-off-outline'} size={20} color="#6B6B6B" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.agreeRow}
            activeOpacity={0.8}
            onPress={() => setAgree((v) => !v)}>
            <View style={[styles.checkbox, agree && styles.checkboxOn]}>
              {agree && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
            </View>
            <Text style={styles.agreeText}>
              I've read and agree with the <Text style={styles.link}>Terms and Conditions</Text> and
              the <Text style={styles.link}>Privacy Policy</Text>.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.7 }]}
            activeOpacity={0.85}
            onPress={handleRegister}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Daftar!</Text>
            )}
          </TouchableOpacity>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Sudah punya akun? </Text>
            <TouchableOpacity onPress={() => router.replace('/login')}>
              <Text style={styles.link}>Masuk.</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flexGrow: 1, paddingHorizontal: 27, paddingTop: 70, paddingBottom: 30 },
  title: { fontSize: 22, fontWeight: '700', color: '#111111' },
  subtitle: { fontSize: 12, color: '#555555', marginTop: 6, marginBottom: 22 },
  label: { fontSize: 12, fontWeight: '700', color: '#111111', marginBottom: 8 },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#D5D5D5',
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#111111',
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  inputFocus: { borderColor: '#8DB84A', borderWidth: 1.5 },
  passwordWrap: { justifyContent: 'center' },
  passwordInput: { paddingRight: 48 },
  eye: { position: 'absolute', right: 16, top: 15 },
  agreeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 4 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BDBDBD',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxOn: { backgroundColor: '#8DB84A', borderColor: '#8DB84A' },
  agreeText: { flex: 1, fontSize: 12, lineHeight: 18, color: '#444444' },
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
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  loginText: { fontSize: 12, color: '#555555' },
});