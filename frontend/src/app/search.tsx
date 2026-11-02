// app/search.tsx
// Halaman Search: bar pencarian, kategori, dan daftar "Kamu Mungkin Suka".
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
    useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BAR_H, BottomBar } from '@/components/bottom-bar';

// ---- route ----
const ROUTE_AYO_MASAK = '/ayomasak';

// ---- ukuran (sama gaya dengan home) ----
const SEARCH_TOP = 20; // jarak bar pencarian dari atas (di bawah status bar)
const SEARCH_H = 45; // tinggi bar pencarian
const CATEGORY_IMG = 50; // ukuran gambar kategori, makin kecil makin renggang
const CATEGORY_ITEM_W = 58; // lebar tiap kolom kategori (gambar + tulisan)

const IMG = {
  btnSearch: require('@/assets/expo.icon/btn-search.svg'), // ikon bulat search
};

const CATEGORIES = [
  { key: 'menu-satset', label: 'Menu Satset', image: require('@/assets/images/home/makanan1.svg') },
  { key: 'makan-besar', label: 'Makan Besar', image: require('@/assets/images/home/makanan2.svg') },
  { key: 'sup-kuah', label: 'Sup & Kuah', image: require('@/assets/images/home/makanan3.svg') },
  { key: 'cemilan', label: 'Cemilan', image: require('@/assets/images/home/makanan4.svg') },
  { key: 'fit-diet', label: 'Fit & Diet', image: require('@/assets/images/home/makanan5.svg') },
];

// Data contoh. Nanti diganti hasil dari API (GET /recipes/suggestions).
type Suggestion = {
  id: string;
  title: string;
  image: any;
  protein: number;
  fat: number;
  carbs: number;
  kcal: number;
  summary: string;
  time: string;
  servings: string;
};

const LOREM =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et';

const SUGGESTIONS: Suggestion[] = [
  {
    id: 'steak',
    title: 'Steak',
    image: require('@/assets/images/home/home7.jpg'),
    protein: 32,
    fat: 24,
    carbs: 20,
    kcal: 990,
    summary: LOREM,
    time: '50 Menit',
    servings: '4-5 Orang',
  },
  {
    id: 'nasi-goreng',
    title: 'Nasi Goreng',
    image: require('@/assets/images/search/enak1.png'),
    protein: 32,
    fat: 24,
    carbs: 20,
    kcal: 990,
    summary: LOREM,
    time: '50 Menit',
    servings: '4-5 Orang',
  },
  {
    id: 'sop-ayam',
    title: 'Sop Ayam',
    image: require('@/assets/images/search/enak2.png'),
    protein: 32,
    fat: 24,
    carbs: 20,
    kcal: 990,
    summary: LOREM,
    time: '50 Menit',
    servings: '4-5 Orang',
  },
];

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const s = width / 390; // skala layar, samakan dengan yang dipakai di home
  const [query, setQuery] = useState('');

  // ---- ukuran kartu: kartu utama + rangkuman yang menyelip di baliknya ----
  const boxW = width - 40 * s; // lebar total
  const overlap = 26; // rangkuman menyelip di balik kartu utama
  const mainW = boxW * 0.7;
  const mainH = mainW * 0.5;
  const sumW = boxW - mainW + overlap;
  const imgSize = mainH * 0.82; // gambar persegi 1:1

  // Filter sederhana berdasarkan nama masakan
  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SUGGESTIONS;
    return SUGGESTIONS.filter((r) => r.title.toLowerCase().includes(q));
  }, [query]);

  const goAyoMasak = (id: string) =>
    router.push({ pathname: ROUTE_AYO_MASAK, params: { id } } as any);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: insets.top + SEARCH_TOP * s,
          paddingBottom: BAR_H + insets.bottom + 40 * s,
        }}>
        {/* Bar pencarian */}
        <View style={[styles.searchBar, { marginHorizontal: 24 * s, height: SEARCH_H * s }]}>
          <Image source={IMG.btnSearch} style={styles.searchIcon} contentFit="contain" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Apa yang ingin anda ramu hari ini?"
            placeholderTextColor="#7A7A7A"
            style={styles.searchInput}
            returnKeyType="search"
          />
          <Ionicons name="options-outline" size={20} color="#6B6B6B" />
        </View>

        {/* Kategori */}
        <View style={[styles.categoryRow, { marginHorizontal: 20 * s }]}>
          {CATEGORIES.map((c) => (
            <Pressable key={c.key} style={[styles.categoryItem, { width: CATEGORY_ITEM_W }]}>
              <View style={styles.categoryRing}>
                <Image
                  source={c.image}
                  style={{ width: CATEGORY_IMG, height: CATEGORY_IMG }}
                  contentFit="contain"
                />
              </View>
              <Text style={styles.categoryLabel} numberOfLines={2}>
                {c.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Kamu Mungkin Suka</Text>

        {/* Daftar kartu */}
        {data.map((r) => (
          <View key={r.id} style={[styles.cardBox, { width: boxW, marginHorizontal: 20 * s }]}>
            {/* Rangkuman (di belakang kartu utama, nempel kanan) */}
            <View style={[styles.summary, { width: sumW, height: mainH }]}>
              <View style={{ paddingLeft: overlap + 6 }}>
                <Text style={styles.summaryTitle}>Rangkuman</Text>
                <Text style={styles.summaryText} numberOfLines={4}>
                  {r.summary}
                </Text>

                <View style={styles.metaRow}>
                  <Ionicons name="time-outline" size={11} color="#222" />
                  <Text style={styles.metaText}>{r.time}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Ionicons name="people-outline" size={11} color="#222" />
                  <Text style={styles.metaText}>{r.servings}</Text>
                </View>

                <Pressable style={styles.cookBtn} onPress={() => goAyoMasak(r.id)}>
                  <Text style={styles.cookBtnText}>Ayo Masak!</Text>
                </Pressable>
              </View>
            </View>

            {/* Kartu utama */}
            <View style={[styles.mainCard, { width: mainW, height: mainH }]}>
              <Image
                source={r.image}
                style={{ width: imgSize, height: imgSize, borderRadius: 10 }}
                contentFit="cover"
              />
              <View style={styles.mainInfo}>
                <Text style={styles.recipeTitle} numberOfLines={1}>
                  {r.title}
                </Text>
                <View style={styles.kcalBadge}>
                  <Ionicons name="flame" size={9} color="#E8590C" />
                  <Text style={styles.kcalText}>{r.kcal} kcal</Text>
                </View>

                <View style={styles.macroRow}>
                  <Macro value={r.protein} label="Protein" />
                  <Macro value={r.fat} label="Fats" />
                  <Macro value={r.carbs} label="Carbs" />
                </View>
              </View>
            </View>
          </View>
        ))}

        {data.length === 0 && <Text style={styles.empty}>Resep tidak ditemukan</Text>}
      </ScrollView>

      <BottomBar current="search" />
    </View>
  );
}

function Macro({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.macro}>
      <View style={styles.macroBar} />
      <View>
        <Text style={styles.macroValue}>{value} g</Text>
        <Text style={styles.macroLabel}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  // Bar pencarian
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingLeft: 5,
    paddingRight: 16,
    borderWidth: 1.5,
    borderColor: '#CFE08A',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  searchIcon: { width: 38, height: 38 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 13, color: '#111', paddingVertical: 0 },

  // Kategori
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  categoryItem: { alignItems: 'center' },
  categoryRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#DDEBB0',
    borderWidth: 2,
    borderColor: '#B9D66B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '500',
    color: '#111',
    textAlign: 'center',
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111111',
    marginHorizontal: 20,
    marginTop: 22,
    marginBottom: 12,
  },

  // Kartu
  cardBox: { marginBottom: 16, flexDirection: 'row' },
  mainCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#D5E58F',
    paddingHorizontal: 8,
    zIndex: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  mainInfo: { flex: 1, marginLeft: 10 },
  recipeTitle: { fontSize: 15, fontWeight: '700', color: '#111' },
  kcalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 3,
    backgroundColor: '#FFE7C2',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginTop: 3,
  },
  kcalText: { fontSize: 7, fontWeight: '600', color: '#B45309' },
  macroRow: { flexDirection: 'row', marginTop: 8, gap: 8 },
  macro: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  macroBar: { width: 2, height: 22, borderRadius: 1, backgroundColor: '#8DB63C' },
  macroValue: { fontSize: 11, fontWeight: '700', color: '#111' },
  macroLabel: { fontSize: 7, color: '#6B6B6B' },

  // Rangkuman
  summary: {
    position: 'absolute',
    right: 0,
    top: 0,
    backgroundColor: '#B9BDE8',
    borderRadius: 18,
    justifyContent: 'center',
    paddingRight: 8,
    zIndex: 1,
  },
  summaryTitle: { fontSize: 10, fontWeight: '700', color: '#2B2F77' },
  summaryText: { fontSize: 6, color: '#2B2F77', marginTop: 2, lineHeight: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaText: { fontSize: 7, color: '#222' },
  cookBtn: {
    alignSelf: 'flex-start',
    marginTop: 6,
    backgroundColor: '#8DB63C',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cookBtnText: { fontSize: 7, fontWeight: '700', color: '#FFFFFF' },

  empty: { textAlign: 'center', color: '#7A7A7A', marginTop: 24, fontSize: 13 },
});
