import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const GREEN = '#8DB84A';
const AVATAR = 84;
const AVATAR_BUCKET = 'avatars'; // bucket Supabase Storage

type Field = 'nickname' | 'username' | 'email' | 'password' | null;

export default function EditProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const s = width / 375;

  // data asli (untuk membandingkan apakah ada perubahan)
  const [userId, setUserId] = useState('');
  const [orig, setOrig] = useState({ nickname: '', username: '', email: '', avatar: '' });

  // isi form
  const [nickname, setNickname] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [newImageUri, setNewImageUri] = useState<string | null>(null);

  const [focused, setFocused] = useState<Field>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) return;
      const meta = u.user_metadata || {};
      const emailPrefix = u.email?.split('@')[0] || '';
      const nick = meta.nickname || meta.full_name || '';
      const uname = meta.username || emailPrefix;
      setUserId(u.id);
      setNickname(nick);
      setUsername(uname);
      setEmail(u.email || '');
      setOrig({ nickname: nick, username: uname, email: u.email || '', avatar: meta.avatar_url || '' });
    });
  }, []);

  // ---- ada perubahan? tombol Simpan hanya hidup kalau true ----
  const changed =
    nickname.trim() !== orig.nickname ||
    username.trim() !== orig.username ||
    email.trim().toLowerCase() !== orig.email.toLowerCase() ||
    password.length > 0 ||
    newImageUri !== null;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/profile' as any);
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Izin dibutuhkan', 'Izinkan akses galeri untuk mengganti foto profil.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) setNewImageUri(result.assets[0].uri);
  };

  const uploadAvatar = async (uri: string): Promise<string> => {
    const res = await fetch(uri);
    const buf = await res.arrayBuffer();
    const path = `${userId}/avatar.jpg`;
    const { error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, buf, { contentType: 'image/jpeg', upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    return `${data.publicUrl}?t=${Date.now()}`;
  };

  const onSave = async () => {
    const nick = nickname.trim();
    const uname = username.trim().toLowerCase();
    const mail = email.trim().toLowerCase();

    // ---- validasi ----
    if (!nick) return Alert.alert('Oops', 'Nama panggilan tidak boleh kosong.');
    if (!/^[a-z0-9._]{3,20}$/.test(uname))
      return Alert.alert(
        'Username tidak valid',
        'Gunakan 3-20 karakter: huruf kecil, angka, titik, atau underscore.'
      );
    if (!/^\S+@\S+\.\S+$/.test(mail)) return Alert.alert('Oops', 'Format email tidak valid.');
    if (password.length > 0 && password.length < 6)
      return Alert.alert('Oops', 'Kata sandi minimal 6 karakter.');

    setLoading(true);
    try {
      // foto
      let avatar = orig.avatar;
      if (newImageUri) avatar = await uploadAvatar(newImageUri);

      // data yang dikirim ke Supabase
      const payload: any = {
        data: { nickname: nick, full_name: nick, username: uname, avatar_url: avatar },
      };
      const emailChanged = mail !== orig.email.toLowerCase();
      if (emailChanged) payload.email = mail;
      if (password.length > 0) payload.password = password;

      const { error } = await supabase.auth.updateUser(payload);
      if (error) throw error;

      if (emailChanged) {
        // Supabase mengirim link konfirmasi ke email baru; email lama tetap aktif sampai dikonfirmasi
        Alert.alert(
          'Cek email kamu',
          'Kami mengirim link konfirmasi ke email baru. Email akan berganti setelah kamu konfirmasi.'
        );
      }
      goBack(); // kembali ke profile.tsx (otomatis memuat ulang data)
    } catch (e: any) {
      Alert.alert('Gagal menyimpan', e?.message || 'Terjadi kesalahan, coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const shownAvatar = newImageUri || orig.avatar;
  const inputStyle = (f: Field) => [styles.input, focused === f && { borderColor: GREEN }];

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header: hanya tombol back */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={goBack} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#111111" />
        </Pressable>
        <Text style={styles.headerTitle}>Edit Profil</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}>
        {/* Foto profil + pensil untuk ganti foto */}
        <View style={{ alignItems: 'center', marginTop: 24 * s }}>
          <Pressable onPress={pickImage} style={{ width: AVATAR * s, height: AVATAR * s }}>
            <View
              style={[
                styles.avatar,
                { width: AVATAR * s, height: AVATAR * s, borderRadius: (AVATAR * s) / 2 },
              ]}>
              {shownAvatar ? (
                <Image
                  source={{ uri: shownAvatar }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                />
              ) : (
                <Ionicons name="person" size={52 * s} color="#9DC35A" />
              )}
            </View>
            <View style={styles.pencil}>
              <Ionicons name="pencil" size={11} color="#FFFFFF" />
            </View>
          </Pressable>
        </View>

        {/* Form */}
        <View style={{ marginHorizontal: 24 * s, marginTop: 24 * s }}>
          <Text style={styles.label}>Nama Panggilan</Text>
          <TextInput
            value={nickname}
            onChangeText={setNickname}
            placeholder="Nama panggilan"
            placeholderTextColor="#A8A8A8"
            onFocus={() => setFocused('nickname')}
            onBlur={() => setFocused(null)}
            style={inputStyle('nickname')}
            maxLength={30}
          />

          <Text style={[styles.label, styles.gap]}>Username</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="username"
            placeholderTextColor="#A8A8A8"
            autoCapitalize="none"
            autoCorrect={false}
            onFocus={() => setFocused('username')}
            onBlur={() => setFocused(null)}
            style={inputStyle('username')}
            maxLength={20}
          />

          <Text style={[styles.label, styles.gap]}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="name@email.com"
            placeholderTextColor="#A8A8A8"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            onFocus={() => setFocused('email')}
            onBlur={() => setFocused(null)}
            style={inputStyle('email')}
          />

          <Text style={[styles.label, styles.gap]}>Kata Sandi</Text>
          <View style={[inputStyle('password'), styles.passWrap]}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="********"
              placeholderTextColor="#A8A8A8"
              secureTextEntry={!showPass}
              autoCapitalize="none"
              autoCorrect={false}
              onFocus={() => setFocused('password')}
              onBlur={() => setFocused(null)}
              style={styles.passInput}
            />
            <Pressable onPress={() => setShowPass((v) => !v)} hitSlop={10}>
              <Ionicons
                name={showPass ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color="#8A8A8A"
              />
            </Pressable>
          </View>
          <Text style={styles.hint}>Kosongkan kalau tidak ingin mengganti kata sandi.</Text>

          {/* Simpan: abu-abu & mati kalau belum ada perubahan, hijau kalau ada */}
          <TouchableOpacity
            style={[styles.saveBtn, changed ? styles.saveOn : styles.saveOff]}
            activeOpacity={0.85}
            disabled={!changed || loading}
            onPress={onSave}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={[styles.saveText, !changed && { color: '#9A9A9A' }]}>
                Simpan Perubahan
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  backBtn: { width: 32, height: 32, justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#111111' },

  avatar: {
    backgroundColor: '#FFFBD6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pencil: {
    position: 'absolute',
    right: -2,
    bottom: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#AEB8E6',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  label: { fontSize: 11.5, fontWeight: '800', color: '#111111', marginBottom: 6 },
  gap: { marginTop: 14 },
  input: {
    height: 46,
    borderWidth: 1.5,
    borderColor: '#DADADA',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 13,
    color: '#111111',
    backgroundColor: '#FFFFFF',
  },
  passWrap: { flexDirection: 'row', alignItems: 'center' },
  passInput: { flex: 1, fontSize: 13, color: '#111111', height: '100%' },
  hint: { marginTop: 5, fontSize: 10.5, color: '#9A9A9A' },

  saveBtn: {
    marginTop: 26,
    height: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveOn: { backgroundColor: GREEN },
  saveOff: { backgroundColor: '#E2E2E2' },
  saveText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});