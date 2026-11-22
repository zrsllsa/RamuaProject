import { api } from '@/lib/api';
import { firstParam } from '@/lib/recipe-flow';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MascotMeramu = require('../../assets/images/meramu.png');

const GREEN = '#8FCB4C';

const CHECKS = [
  { label: 'Mengenali bahan dari fotomu', icon: 'camera-outline', color: '#7CB342' },
  { label: 'Mencocokkan dengan target kalori dan waktu', icon: 'options-outline', color: '#7CB342' },
  { label: 'Menyaring resep sesuai alat masakmu', icon: 'restaurant-outline', color: '#5B7CFA' },
  { label: 'Menyusun daftar resep untukmu', icon: 'book-outline', color: '#8A8A8A' },
] as const;

export default function BufferingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    bahan_terdeteksi?: string;
    target_kalori?: string;
    waktu_memasak?: string;
    jumlah_orang?: string;
    alat_terpilih?: string;
  }>();
  const payload = useMemo(() => {
    // Ambil dan pastikan tipe data sesuai skema Pydantic backend
    return {
      bahan: JSON.parse(firstParam(params.bahan_terdeteksi) || '[]'),
      kalori: Number(firstParam(params.target_kalori) || 400),
      waktu: Number(firstParam(params.waktu_memasak) || 30),
      porsi: Number(firstParam(params.jumlah_orang) || 2),
      alat: JSON.parse(firstParam(params.alat_terpilih) || '[]'),
    };
  }, [
    params.bahan_terdeteksi,
    params.target_kalori,
    params.waktu_memasak,
    params.jumlah_orang,
    params.alat_terpilih,
  ]);
  const [doneCount, setDoneCount] = useState(0);
  const [statusText] = useState('Hampir selesai...');
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

    const timers = [1, 2, 3, 4].map((step) =>
      setTimeout(() => {
        if (!cancelledRef.current) setDoneCount(step);
      }, step * 700)
    );

    const loadRecipes = async () => {
      try {
        const response = await api('/api/recipes/recommend', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        if (cancelledRef.current) return;

        // Begitu data diterima, langsung navigasi ke layar hasil!
        router.replace({
          pathname: '/hasil',
          params: { resepList: JSON.stringify(response) },
        });
      } catch (error) {
        console.error(error);
      }
    };

    loadRecipes();

    return () => {
      cancelledRef.current = true;
      timers.forEach(clearTimeout);
    };
  }, [payload, router]);

  const cancel = () => {
    cancelledRef.current = true;
    router.back();
  };

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.container}>
      <StatusBar style="dark" />
      <Image source={MascotMeramu} resizeMode="cover" style={styles.mascot} />

      <Text style={styles.title}>Meramu Resepmu...</Text>
      <Text style={styles.subtitle}>
        Sebentar ya, kami sedang mencocokkan bahan dengan preferensimu!
      </Text>

      <View style={styles.card}>
        {CHECKS.map((item, index) => {
          const done = index < doneCount;
          return (
            <View key={item.label} style={styles.row}>
              <View style={[styles.iconBox, { backgroundColor: done ? '#F3F8E8' : '#F6F6F6' }]}>
                <Ionicons name={item.icon as any} size={18} color={item.color} />
              </View>
              <Text style={styles.rowText}>{item.label}</Text>
              {done ? (
                <Ionicons name="checkmark-circle" size={22} color={GREEN} />
              ) : (
                <View style={styles.emptyCheck} />
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.progressTrack}>
        <LinearGradient
          colors={['#8FCB4C', '#F6C445']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.progressFill, { width: `${(doneCount / CHECKS.length) * 100}%` }]}
        />
      </View>
      <Text style={styles.progressLabel}>{statusText}</Text>

      <Pressable onPress={cancel} style={styles.cancel}>
        <Text style={styles.cancelText}>Batal</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  mascot: { width: '100%', height: 280 },
  title: { marginTop: 8, textAlign: 'center', fontSize: 22, fontWeight: '800', color: '#161616', paddingHorizontal: 24 },
  subtitle: { marginTop: 8, textAlign: 'center', color: '#6E6E6E', fontSize: 14, lineHeight: 20, paddingHorizontal: 24 },
  card: {
    marginTop: 22,
    marginHorizontal: 24,
    borderRadius: 20,
    backgroundColor: '#FFF8E8',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, fontSize: 13, fontWeight: '700', color: '#243000' },
  emptyCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D5D5D5',
  },
  progressTrack: {
    marginTop: 22,
    marginHorizontal: 24,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#EEF2E6',
    overflow: 'hidden',
  },
  progressFill: { height: '100%' },
  progressLabel: { marginTop: 10, textAlign: 'center', color: '#6E6E6E', fontSize: 13 },
  cancel: { marginTop: 22, alignItems: 'center', padding: 8 },
  cancelText: { color: '#E23B3B', fontSize: 16, fontWeight: '800' },
});
