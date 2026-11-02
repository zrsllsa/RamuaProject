import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const GREEN = '#8DB84A';

// ====== UKURAN — SETEL DI SINI ======
export const SCAN_SIZE = 80; // tinggi gambar scan (tombol utama, lebih besar dari yang lain)
export const BAR_H = SCAN_SIZE / 1.5; // tinggi shape kuning = setengah dari gambar scan
// =====================================

// ====== ROUTE TUJUAN ======
const ROUTES = {
  home: '/home',
  search: '/search',
  scan: '/scan',
  profile: '/profile',
  save: '/save',
};
// ==========================

export type TabKey = 'home' | 'search' | 'profile' | 'save';

const LEFT: { key: TabKey; label: string; icon: string; iconOff: string }[] = [
  { key: 'home', label: 'Home', icon: 'home', iconOff: 'home-outline' },
  { key: 'search', label: 'Search', icon: 'search', iconOff: 'search-outline' },
];
const RIGHT: { key: TabKey; label: string; icon: string; iconOff: string }[] = [
  { key: 'profile', label: 'Profile', icon: 'person', iconOff: 'person-outline' },
  { key: 'save', label: 'Save', icon: 'bookmark', iconOff: 'bookmark-outline' },
];

// Pakai di tiap halaman:  <BottomBar current="home" />
export function BottomBar({ current }: { current: TabKey }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const renderTab = (t: (typeof LEFT)[number]) => {
    const active = current === t.key;
    return (
      <TouchableOpacity
        key={t.key}
        style={styles.tab}
        activeOpacity={0.7}
        onPress={() => {
          if (!active) router.replace(ROUTES[t.key] as any);
        }}>
        <Ionicons
          name={(active ? t.icon : t.iconOff) as any}
          size={22}
          color={active ? GREEN : '#2B2B2B'}
        />
        <Text style={[styles.label, active && { color: GREEN }]}>{t.label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    // Area penuh setinggi gambar scan supaya bagian scan yang menjulang tetap bisa ditekan
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { height: SCAN_SIZE + insets.bottom }]}>
      {/* Shape kuning (tingginya setengah gambar scan) */}
      <View style={[styles.bar, { height: BAR_H + insets.bottom }]} />

      {/* Deretan tab */}
      <View style={[styles.row, { bottom: insets.bottom, height: BAR_H }]}>
        {LEFT.map(renderTab)}
        <View style={{ width: SCAN_SIZE * 0.9 }} />
        {RIGHT.map(renderTab)}
      </View>

      {/* Tombol scan di tengah, lebih besar dan menjulang di atas shape kuning */}
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.scan, { bottom: insets.bottom }]}
        onPress={() => router.push(ROUTES.scan as any)}>
        <Image
          source={require('@/assets/images/scan.svg')}
          style={styles.scanImg}
          contentFit="contain"
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFF6CC',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 1 },
  label: { fontSize: 10, color: '#2B2B2B' },
  scan: {
    position: 'absolute',
    left: '50%',
    marginLeft: -SCAN_SIZE / 2,
    width: SCAN_SIZE,
    height: SCAN_SIZE,
  },
  scanImg: { width: '100%', height: '100%' },
});