import { StepIndicator } from '@/components/StepIndicator';
import { parseDraft } from '@/lib/recipe-flow';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MascotKalori = require('../../assets/images/setkalori.png');

const GREEN = '#8FCB4C';
const YELLOW = '#F6C445';
const MIN_KCAL = 200;
const MAX_KCAL = 900;

const PRESETS = [
  { key: 'ringan', label: 'Ringan', kcal: 250, icon: 'leaf-outline' },
  { key: 'sedang', label: 'Sedang', kcal: 400, icon: 'happy-outline' },
  { key: 'tinggi', label: 'Tinggi', kcal: 700, icon: 'flame-outline' },
] as const;

const TIMES = [
  { value: 10, label: '10\nmenit' },
  { value: 20, label: '20\nmenit' },
  { value: 30, label: '30\nmenit' },
  { value: 60, label: '60\nmenit' },
  { value: 90, label: '>60\nsantai' },
];

function kcalFromX(x: number, width: number) {
  if (width <= 0) return 400;
  const ratio = Math.min(1, Math.max(0, x / width));
  const raw = MIN_KCAL + ratio * (MAX_KCAL - MIN_KCAL);
  return Math.min(MAX_KCAL, Math.max(MIN_KCAL, Math.round(raw / 10) * 10));
}

export default function PreferencesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ data?: string }>();
  const draft = useMemo(() => parseDraft(params.data), [params.data]);

  const [targetKalori, setTargetKalori] = useState(draft.target_kalori ?? 400);
  const [waktuMemasak, setWaktuMemasak] = useState(draft.waktu_memasak ?? 30);
  const [jumlahOrang, setJumlahOrang] = useState(draft.jumlah_orang ?? 2);
  const [trackWidth, setTrackWidth] = useState(1);

  const ratio = (targetKalori - MIN_KCAL) / (MAX_KCAL - MIN_KCAL);

  const continueNext = () => {
    router.push({
      pathname: '/alat',
      params: {
        data: JSON.stringify({
          bahan_terdeteksi: draft.bahan_terdeteksi,
          target_kalori: targetKalori,
          waktu_memasak: waktuMemasak,
          jumlah_orang: jumlahOrang,
        }),
      },
    } as any);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/scan-result' as any))}
          hitSlop={12}
          style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#111111" />
        </Pressable>
        <Text style={styles.headerTitle}>Preferensi</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}>
        <StepIndicator currentStep={2} />

        <Text style={styles.title}>Atur sesuai Kebutuhanmu</Text>
        <Text style={styles.subtitle}>
          Resep dapat diracik agar sesuai dengan selera dan ketersediaan waktu kamu!
        </Text>
        <Image source={MascotKalori} resizeMode="contain" style={styles.mascot} />

        <View style={styles.card}>
          <View style={styles.sectionHead}>
            <Ionicons name="speedometer-outline" size={18} color={GREEN} />
            <Text style={styles.sectionTitle}>Target kalori per porsi</Text>
          </View>
          <Text style={styles.sectionHint}>Perkiraan, bukan angka pasti</Text>
          <View style={styles.kcalRow}>
            <Text style={styles.kcalValue}>{targetKalori}</Text>
            <Text style={styles.kcalUnit}>kkal</Text>
          </View>

          <View
            style={styles.sliderHit}
            onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={(event) => setTargetKalori(kcalFromX(event.nativeEvent.locationX, trackWidth))}
            onResponderMove={(event) => setTargetKalori(kcalFromX(event.nativeEvent.locationX, trackWidth))}>
            <View style={styles.track}>
              <View style={[styles.trackFill, { width: `${ratio * 100}%` }]} />
            </View>
            <View style={[styles.thumb, { left: Math.max(0, ratio * trackWidth - 14) }]} />
          </View>
          <View style={styles.scaleRow}>
            <Text style={styles.scaleText}>200 kkal</Text>
            <Text style={styles.scaleText}>Seimbang (400)</Text>
            <Text style={styles.scaleText}>900 kkal</Text>
          </View>

          <View style={styles.presetRow}>
            {PRESETS.map((preset) => {
              const active = targetKalori === preset.kcal;
              return (
                <Pressable
                  key={preset.key}
                  style={[styles.preset, active && styles.presetOn]}
                  onPress={() => setTargetKalori(preset.kcal)}>
                  <Ionicons name={preset.icon as any} size={16} color={active ? '#243000' : '#6E8B45'} />
                  <Text style={[styles.presetText, active && styles.presetTextOn]}>{preset.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHead}>
            <Ionicons name="time-outline" size={18} color={GREEN} />
            <Text style={styles.sectionTitle}>Waktu memasak</Text>
          </View>
          <Text style={styles.sectionHint}>Disesuaikan dengan jam laparmu</Text>
          <View style={styles.timeRow}>
            {TIMES.map((item) => {
              const active = waktuMemasak === item.value;
              return (
                <Pressable
                  key={item.value}
                  style={[styles.timeBtn, active && styles.timeBtnOn]}
                  onPress={() => setWaktuMemasak(item.value)}>
                  <Text style={[styles.timeText, active && styles.timeTextOn]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHead}>
            <Ionicons name="people-outline" size={18} color={GREEN} />
            <Text style={styles.sectionTitle}>Jumlah orang</Text>
          </View>
          <Text style={styles.sectionHint}>Takaran bahan akan disesuaikan otomatis</Text>
          <View style={styles.stepper}>
            <Pressable
              style={[styles.stepBtn, styles.stepMinus, jumlahOrang <= 1 && { opacity: 0.4 }]}
              disabled={jumlahOrang <= 1}
              onPress={() => setJumlahOrang((value) => Math.max(1, value - 1))}>
              <Ionicons name="remove" size={22} color="#D46A6A" />
            </Pressable>
            <Text style={styles.peopleValue}>{jumlahOrang}</Text>
            <Pressable
              style={[styles.stepBtn, styles.stepPlus, jumlahOrang >= 12 && { opacity: 0.4 }]}
              disabled={jumlahOrang >= 12}
              onPress={() => setJumlahOrang((value) => Math.min(12, value + 1))}>
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        <Pressable style={styles.nextBtn} onPress={continueNext}>
          <Text style={styles.nextText}>Lanjut ke Alat</Text>
        </Pressable>
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
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#161616' },
  title: { marginTop: 16, marginHorizontal: 20, fontSize: 20, fontWeight: '800', color: '#161616' },
  subtitle: { marginTop: 6, marginHorizontal: 20, color: '#6E6E6E', fontSize: 13, lineHeight: 19 },
  mascot: { alignSelf: 'center', width: 240, height: 165, marginTop: 8 },
  card: {
    marginTop: 16,
    marginHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EEF2E6',
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#161616' },
  sectionHint: { marginTop: 4, color: '#8A8A8A', fontSize: 12 },
  kcalRow: { marginTop: 12, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 6 },
  kcalValue: { fontSize: 42, fontWeight: '800', color: GREEN, lineHeight: 46 },
  kcalUnit: { marginBottom: 6, fontSize: 16, fontWeight: '700', color: GREEN },
  sliderHit: { marginTop: 8, height: 36, justifyContent: 'center' },
  track: { height: 8, borderRadius: 999, backgroundColor: '#E7F3D4', overflow: 'hidden' },
  trackFill: { height: '100%', backgroundColor: GREEN },
  thumb: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: GREEN,
  },
  scaleRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  scaleText: { fontSize: 11, color: '#8A8A8A' },
  presetRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  preset: {
    flex: 1,
    height: 42,
    borderRadius: 999,
    backgroundColor: '#F3F8E8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  presetOn: { backgroundColor: YELLOW },
  presetText: { fontSize: 13, fontWeight: '700', color: '#4E6A32' },
  presetTextOn: { color: '#243000' },
  timeRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  timeBtn: {
    flex: 1,
    minHeight: 58,
    borderRadius: 16,
    backgroundColor: '#F3F8E8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  timeBtnOn: { backgroundColor: YELLOW },
  timeText: { textAlign: 'center', fontSize: 12, fontWeight: '700', color: '#4E6A32' },
  timeTextOn: { color: '#243000' },
  stepper: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  stepBtn: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  stepMinus: { backgroundColor: '#F8E8E8' },
  stepPlus: { backgroundColor: GREEN },
  peopleValue: { fontSize: 36, fontWeight: '800', color: '#6AAA2E' },
  nextBtn: {
    marginTop: 20,
    marginHorizontal: 20,
    height: 52,
    borderRadius: 16,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
