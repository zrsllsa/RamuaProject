import { BottomBar } from '@/components/bottom-bar';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ====== ROUTE TUJUAN ======
const ROUTE_EDIT = '/editprofile'; // editprofile.tsx
const ROUTE_SAVED = '/save'; // save.tsx
const ROUTE_LOGIN = '/login'; // login.tsx
// ==========================

const AVATAR = 84; // ukuran lingkaran foto (px desain, lebar 375)

export default function Profile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const s = width / 375;

  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Dimuat ulang tiap halaman ini tampil lagi (misal habis simpan di edit profil)
  useFocusEffect(
    useCallback(() => {
      supabase.auth.getUser().then(({ data }) => {
        const u = data.user;
        if (!u) return;
        const meta = u.user_metadata || {};
        const emailPrefix = u.email?.split('@')[0] || 'user';
        setName(meta.nickname || meta.full_name || emailPrefix);
        setHandle('@' + (meta.username || emailPrefix));
        setAvatarUrl(meta.avatar_url || null);
      });
    }, [])
  );

  const handleConfirmLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await supabase.auth.signOut();
    } catch {
      // Tetap lanjut keluar ke halaman login jika signOut jaringan bermasalah
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
      router.replace(ROUTE_LOGIN as any);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Judul (tanpa tombol back) */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Profile Anda</Text>
      </View>

      {/* Avatar + tombol pensil -> edit profil */}
      <View style={{ alignItems: 'center', marginTop: 28 * s }}>
        <View style={{ width: AVATAR * s, height: AVATAR * s }}>
          <View
            style={[
              styles.avatar,
              { width: AVATAR * s, height: AVATAR * s, borderRadius: (AVATAR * s) / 2 },
            ]}>
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            ) : (
              <Ionicons name="person" size={52 * s} color="#9DC35A" />
            )}
          </View>

          <Pressable
            onPress={() => router.push(ROUTE_EDIT as any)}
            hitSlop={8}
            style={styles.pencil}>
            <Ionicons name="pencil" size={11} color="#FFFFFF" />
          </Pressable>
        </View>

        <Text style={styles.name}>{name}</Text>
        <Text style={styles.handle}>{handle}</Text>
      </View>

      {/* Resep yang disimpan -> save.tsx */}
      <Pressable
        onPress={() => router.push(ROUTE_SAVED as any)}
        style={({ pressed }) => [
          styles.row,
          { marginTop: 24 * s, marginHorizontal: 24 * s },
          pressed && { opacity: 0.6 },
        ]}>
        <Text style={styles.rowText}>Resep yang disimpan</Text>
        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
      </Pressable>

      <View style={[styles.menuDivider, { marginHorizontal: 24 * s }]} />

      {/* Keluar akun -> buka modal konfirmasi */}
      <Pressable
        onPress={() => setShowLogoutModal(true)}
        style={({ pressed }) => [
          styles.row,
          { marginHorizontal: 24 * s },
          pressed && { opacity: 0.6 },
        ]}>
        <View style={styles.logoutLeft}>
          <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          <Text style={styles.logoutText}>Keluar</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
      </Pressable>

      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isLoggingOut) setShowLogoutModal(false);
        }}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Keluar dari Akun</Text>
            <Text style={styles.modalSubtitle}>
              Apakah anda yakin ingin keluar dari akun?
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
                style={({ pressed }) => [
                  styles.cancelButton,
                  pressed && !isLoggingOut && { opacity: 0.8 },
                ]}>
                <Text style={styles.cancelButtonText}>Batal</Text>
              </Pressable>

              <Pressable
                onPress={handleConfirmLogout}
                disabled={isLoggingOut}
                style={({ pressed }) => [
                  styles.confirmButton,
                  (pressed || isLoggingOut) && { opacity: 0.85 },
                ]}>
                {isLoggingOut ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmButtonText}>Keluar</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <BottomBar current="profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  header: {
    alignItems: 'center',
    paddingBottom: 6,
  },
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

  name: { marginTop: 14, fontSize: 16, fontWeight: '800', color: '#111111' },
  handle: { marginTop: 3, fontSize: 11, color: '#8A8A8A' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  rowText: { fontSize: 13.5, color: '#111111' },
  menuDivider: {
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  logoutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#DC2626',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 28,
    width: '100%',
    maxWidth: 360,
  },
  modalTitle: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: '#1E1E1E',
    marginBottom: 10,
  },
  modalSubtitle: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    color: '#6B7280',
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#8BB94A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#8BB94A',
    fontSize: 15,
    fontWeight: '700',
  },
  confirmButton: {
    flex: 1,
    height: 48,
    borderRadius: 999,
    backgroundColor: '#8BB94A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
