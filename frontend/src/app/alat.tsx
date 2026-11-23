import { RamuaAnimation } from '@/components/RamuaAnimation';
import { StepIndicator } from '@/components/StepIndicator';
import { parseDraft } from '@/lib/recipe-flow';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MascotAlat = require('../../assets/images/alatmasak.png');
const ANIM_ALAT = require('../../assets/ramuanimation/animasi_alatpage.json');

const GREEN = '#8FCB4C';

const TOOLS = [
  { name: 'Kompor', icon: 'flame-outline' },
  { name: 'Wajan', icon: 'restaurant-outline' },
  { name: 'Rice Cooker', icon: 'cube-outline' },
  { name: 'Oven', icon: 'square-outline' },
  { name: 'Microwave', icon: 'radio-outline' },
  { name: 'Air Fryer', icon: 'flash-outline' },
  { name: 'Panci', icon: 'water-outline' },
  { name: 'Kukusan', icon: 'cloud-outline' },
  { name: 'Panggangan', icon: 'sunny-outline' },
  { name: 'Teflon', icon: 'ellipse-outline' },
  { name: 'Blender', icon: 'color-wand-outline' },
  { name: 'Mixer', icon: 'sync-outline' },
  { name: 'Pisau & Talenan', icon: 'cut-outline' },
  { name: 'Saringan', icon: 'grid-outline' },
] as const;

export default function AlatScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ data?: string }>();
  const draft = useMemo(() => parseDraft(params.data), [params.data]);
  const [alatTerpilih, setAlatTerpilih] = useState<string[]>(draft.alat_terpilih ?? []);

  const gap = 12;
  const colW = (width - 40 - gap * 2) / 3;

  const toggle = (name: string) => {
    setAlatTerpilih((prev) => (prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]));
  };

  const continueNext = () => {
    router.push({
      pathname: '/buffering',
      params: {
        bahan_terdeteksi: JSON.stringify(draft.bahan_terdeteksi ?? []),
        target_kalori: String(draft.target_kalori ?? 400),
        waktu_memasak: String(draft.waktu_memasak ?? 30),
        jumlah_orang: String(draft.jumlah_orang ?? 2),
        alat_terpilih: JSON.stringify(alatTerpilih),
      },
    } as any);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/preferences' as any))}
          hitSlop={12}
          style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#111111" />
        </Pressable>
        <Text style={styles.headerTitle}>Alat</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}>
        <StepIndicator currentStep={3} />

        <Text style={styles.title}>Pilih Alat Masakmu</Text>
        <Text style={styles.subtitle}>Ketuk alat yang kamu punya atau ingin pakai hari ini.</Text>
        <View style={styles.mascotWrap}>
          <RamuaAnimation
            lottieSource={ANIM_ALAT}
            pngSource={MascotAlat}
            width={240}
            height={165}
            resizeMode="contain"
            renderMode="AUTOMATIC"
            isActive={isFocused}
          />
        </View>

        <View style={styles.grid}>
          {TOOLS.map((tool) => {
            const selected = alatTerpilih.includes(tool.name);
            return (
              <Pressable
                key={tool.name}
                onPress={() => toggle(tool.name)}
                style={[styles.tool, { width: colW, height: colW }, selected && styles.toolOn]}>
                {selected ? (
                  <View style={styles.check}>
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                  </View>
                ) : null}
                <View style={[styles.iconBubble, selected && styles.iconBubbleOn]}>
                  <Ionicons name={tool.icon as any} size={22} color={selected ? '#243000' : '#7D8A70'} />
                </View>
                <Text style={[styles.toolName, selected && styles.toolNameOn]} numberOfLines={2}>
                  {tool.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.summary}>
          <Ionicons name="checkmark-circle" size={28} color={GREEN} />
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryTitle}>Alat terpilih ({alatTerpilih.length})</Text>
            <Text style={styles.summaryHint}>Siap memasak sesuai perlengkapanmu</Text>
          </View>
          <View style={styles.summaryIcons}>
            {alatTerpilih.slice(0, 3).map((name) => {
              const tool = TOOLS.find((item) => item.name === name);
              if (!tool) return null;
              return (
                <View key={name} style={styles.summaryIcon}>
                  <Ionicons name={tool.icon as any} size={14} color="#243000" />
                </View>
              );
            })}
          </View>
        </View>

        <Pressable style={styles.nextBtn} onPress={continueNext}>
          <Text style={styles.nextText}>Lanjut ke Hasil</Text>
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
  mascotWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  grid: { marginTop: 18, marginHorizontal: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tool: {
    borderRadius: 18,
    backgroundColor: '#F3F8EA',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  toolOn: { borderColor: GREEN, backgroundColor: '#FFFFFF' },
  check: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E7F0DA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBubbleOn: { backgroundColor: '#F6E27A' },
  toolName: { marginTop: 8, textAlign: 'center', fontSize: 12, fontWeight: '700', color: '#66735C' },
  toolNameOn: { color: '#243000' },
  summary: {
    marginTop: 18,
    marginHorizontal: 20,
    borderRadius: 18,
    backgroundColor: '#F7FBF1',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryTitle: { fontSize: 14, fontWeight: '800', color: '#161616' },
  summaryHint: { marginTop: 2, fontSize: 12, color: '#6E6E6E' },
  summaryIcons: { flexDirection: 'row', gap: 6 },
  summaryIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F6E27A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtn: {
    marginTop: 18,
    marginHorizontal: 20,
    height: 52,
    borderRadius: 16,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
