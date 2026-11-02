// app/scan-food.tsx
// Halaman Scan Food: kamera langsung terbuka, bisa jepret atau impor dari galeri.
// Setelah foto dipilih -> ke halaman pemeriksaan bahan (scan-result).
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// import ScanHelpModal from '@/components/scan-help-modal';

// ---- route ----
const ROUTE_SCAN_RESULT = '/scan-result'; // halaman pemeriksaan bahan (dibuat di langkah berikutnya)

// ---- ukuran ----
const SHEET_H = 130; // tinggi panel krem di bawah (di luar safe area)
const SHUTTER_SIZE = 84; // tombol jepret
const FRAME_RATIO = 0.72; // lebar bingkai = 72% lebar layar
const CORNER = 34; // panjang sudut bingkai
const CORNER_W = 4; // tebal sudut bingkai
const FRAME_COLOR = '#FFE066';

export default function ScanFoodScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [helpVisible, setHelpVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  const frameSize = width * FRAME_RATIO;

  // Lanjut ke halaman pemeriksaan bahan sambil membawa alamat foto
  const goToResult = (uri: string) =>
    router.push({ pathname: ROUTE_SCAN_RESULT, params: { uri } } as any);

  // Tombol jepret
  const takePhoto = async () => {
    if (busy || !cameraRef.current) return;
    try {
      setBusy(true);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (photo?.uri) goToResult(photo.uri);
    } catch {
      Alert.alert('Gagal', 'Foto gagal diambil, coba lagi ya.');
    } finally {
      setBusy(false);
    }
  };

  // Tombol Galeri
  const pickFromGallery = async () => {
    if (busy) return;
    try {
      setBusy(true);
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });
      if (!res.canceled && res.assets?.[0]?.uri) goToResult(res.assets[0].uri);
    } catch {
      Alert.alert('Gagal', 'Gambar gagal dibuka, coba lagi ya.');
    } finally {
      setBusy(false);
    }
  };

  // ---- izin kamera belum dicek ----
  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#8DB63C" />
      </View>
    );
  }

  // ---- izin kamera ditolak / belum diberikan ----
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Ionicons name="camera-outline" size={48} color="#8DB63C" />
        <Text style={styles.permTitle}>Izin kamera dibutuhkan</Text>
        <Text style={styles.permDesc}>
          Ramua butuh kamera untuk memindai bahan makananmu. Kamu juga bisa impor foto dari galeri.
        </Text>
        <Pressable style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Izinkan Kamera</Text>
        </Pressable>
        <Pressable onPress={pickFromGallery} style={{ marginTop: 12 }}>
          <Text style={styles.permLink}>Pilih dari Galeri</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Kamera memenuhi layar */}
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      {/* Tips di atas */}
      <View style={[styles.tipWrap, { top: insets.top + 12 }]}>
        <View style={styles.tipPill}>
          <Ionicons name="sunny-outline" size={16} color="#8DB63C" />
          <Text style={styles.tipText}>Letakkan bahan terpisah & cahaya cukup</Text>
        </View>
      </View>

      {/* Bingkai pemindai di tengah */}
      <View
        pointerEvents="none"
        style={[
          styles.frameWrap,
          { top: insets.top + 90, width: frameSize, height: frameSize, left: (width - frameSize) / 2 },
        ]}>
        <View style={[styles.corner, styles.cTL]} />
        <View style={[styles.corner, styles.cTR]} />
        <View style={[styles.corner, styles.cBL]} />
        <View style={[styles.corner, styles.cBR]} />

        <View style={styles.focusIcon}>
          <Ionicons name="scan-outline" size={26} color="#FFFFFF" />
        </View>
      </View>

      <Text style={[styles.hint, { top: insets.top + 90 + frameSize + 14 }]}>
        Sekali jepret, resep lezat langsung diramu!
      </Text>

      {/* Panel bawah */}
      <View style={[styles.sheet, { height: SHEET_H + insets.bottom, paddingBottom: insets.bottom }]}>
        {/* Galeri */}
        <View style={styles.sideItem}>
          <Pressable style={styles.sideBtn} onPress={pickFromGallery}>
            <Ionicons name="images-outline" size={26} color="#1F2D0A" />
          </Pressable>
          <Text style={styles.sideLabel}>Galeri</Text>
        </View>

        {/* Bantuan */}
        <View style={styles.sideItem}>
          <Pressable style={styles.sideBtn} onPress={() => setHelpVisible(true)}>
            <Ionicons name="bulb-outline" size={26} color="#1F2D0A" />
            <View style={styles.dot} />
          </Pressable>
          <Text style={styles.sideLabel}>Bantuan</Text>
        </View>
      </View>

      {/* Tombol jepret di tengah, menonjol ke atas panel */}
      <Pressable
        onPress={takePhoto}
        disabled={busy}
        style={[styles.shutterRing, { bottom: SHEET_H + insets.bottom - SHUTTER_SIZE / 2 - 4 }]}>
        <View style={styles.shutterInner}>
          {busy ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Ionicons name="aperture-outline" size={38} color="#FFFFFF" />
          )}
        </View>
      </Pressable>
 
      {/* <ScanHelpModal visible={helpVisible} onClose={() => setHelpVisible(false)} /> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },

  // Izin kamera
  center: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  permTitle: { fontSize: 18, fontWeight: '700', color: '#111111', marginTop: 8 },
  permDesc: { fontSize: 13, color: '#666666', textAlign: 'center', lineHeight: 19 },
  permBtn: {
    marginTop: 12,
    backgroundColor: '#8DB63C',
    borderRadius: 999,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  permBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  permLink: { color: '#4F7A0F', fontWeight: '600', fontSize: 13 },

  // Tips atas
  tipWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  tipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  tipText: { fontSize: 12, color: '#222222' },

  // Bingkai
  frameWrap: { position: 'absolute' },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: FRAME_COLOR },
  cTL: { top: 0, left: 0, borderTopWidth: CORNER_W, borderLeftWidth: CORNER_W, borderTopLeftRadius: 14 },
  cTR: { top: 0, right: 0, borderTopWidth: CORNER_W, borderRightWidth: CORNER_W, borderTopRightRadius: 14 },
  cBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_W, borderLeftWidth: CORNER_W, borderBottomLeftRadius: 14 },
  cBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_W, borderRightWidth: CORNER_W, borderBottomRightRadius: 14 },
  focusIcon: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -24,
    marginLeft: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 12,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 4,
  },

  // Panel bawah
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFBE0',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 20,
  },
  sideItem: { alignItems: 'center', gap: 6 },
  sideBtn: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#9BD05A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideLabel: { fontSize: 12, fontWeight: '600', color: '#111111' },
  dot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#1F2D0A',
  },

  // Tombol jepret
  shutterRing: {
    position: 'absolute',
    alignSelf: 'center',
    width: SHUTTER_SIZE + 8,
    height: SHUTTER_SIZE + 8,
    borderRadius: (SHUTTER_SIZE + 8) / 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 10,
  },
  shutterInner: {
    width: SHUTTER_SIZE,
    height: SHUTTER_SIZE,
    borderRadius: SHUTTER_SIZE / 2,
    backgroundColor: '#8DB63C',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
