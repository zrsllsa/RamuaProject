// app/search.tsx
// Halaman Search: bar pencarian, kategori, dan daftar "Kamu Mungkin Suka".
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
    useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BAR_H, BottomBar } from '@/components/bottom-bar';
import { SaveSuccessModal } from '@/components/SaveSuccessModal';
import { api } from '@/lib/api';
import { firstParam } from '@/lib/recipe-flow';
import { formatKkal, getFallbackImage, macroBarPercent } from '@/lib/resep';

// Area sentuh tombol "Ayo Masak!" diperluas (±44px) tanpa mengubah layout
const COOK_BTN_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

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

type CatalogRecipe = {
  id: string | number;
  nama: string;
  kategori: string;
  rangkuman: string;
  kalori: string;
  protein: string;
  fats: string;
  carbs: string;
  waktu_masak: string;
  porsi: string;
  alat_masak?: string;
  image_url: string;
  bahan?: { nama: string; takaran: string; status?: string }[];
  bumbu_dasar?: string;
  langkah?: { judul: string; deskripsi: string; durasi: string; bahan_terkait?: string[] }[];
};

const FETCH_TIMEOUT_MS = 3000;

function categoryFromParams(kategori?: string | string[], label?: string | string[]) {
  const named = firstParam(label);
  if (named && CATEGORIES.some((item) => item.label === named)) return named;
  const key = firstParam(kategori);
  return CATEGORIES.find((item) => item.key === key || item.label === key)?.label ?? null;
}

function recipeMatchesQuery(recipe: CatalogRecipe, needle: string): boolean {
  if (String(recipe.nama || '').toLowerCase().includes(needle)) return true;
  for (const bahan of recipe.bahan ?? []) {
    const nama = typeof bahan === 'string' ? bahan : bahan?.nama;
    if (String(nama || '').toLowerCase().includes(needle)) return true;
  }
  return false;
}

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ kategori?: string; label?: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const s = width / 390; // skala layar, samakan dengan yang dipakai di home
  const [query, setQuery] = useState('');
  const paramKategori = firstParam(params.kategori);
  const paramLabel = firstParam(params.label);
  const [kategori, setKategori] = useState<string | null>(() => categoryFromParams(paramKategori, paramLabel));
  const [allRecipes, setAllRecipes] = useState<CatalogRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [savedNames, setSavedNames] = useState<Record<string, boolean>>({});
  const [savingName, setSavingName] = useState<string | null>(null);
  const [savedModalVisible, setSavedModalVisible] = useState(false);

  // ---- ukuran kartu: kartu utama + rangkuman yang menyelip di baliknya ----
  const boxW = width - 40 * s; // lebar total
  const overlap = 26; // rangkuman menyelip di balik kartu utama
  const mainW = boxW * 0.7;
  const mainH = mainW * 0.5;
  const sumW = boxW - mainW + overlap;
  const imgSize = mainH * 0.82; // gambar persegi 1:1

  useEffect(() => {
    setKategori(categoryFromParams(paramKategori, paramLabel));
  }, [paramKategori, paramLabel]);

  const fetchCatalog = useCallback(async (signal?: AbortSignal) => {
    try {
      const list = await api<CatalogRecipe[]>('/api/recipes', { signal });
      if (!signal?.aborted) {
        setAllRecipes(Array.isArray(list) ? list : []);
        setError('');
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setError('Waktu muat habis (>3 detik). Tarik atau tekan Muat Ulang.');
      } else {
        setError(err?.message || 'Gagal memuat resep.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    fetchCatalog(controller.signal).finally(() => clearTimeout(timeoutId));

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [fetchCatalog]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      api<any[]>('/api/recipes/saved')
        .then((list) => {
          if (!active || !Array.isArray(list)) return;
          const next: Record<string, boolean> = {};
          for (const item of list) {
            const key = String(item?.nama || item?.title || '').trim().toLowerCase();
            if (key) next[key] = true;
          }
          setSavedNames(next);
        })
        .catch(() => {});
      return () => {
        active = false;
      };
    }, [])
  );

  const handleSaveRecipe = useCallback(
    async (item: CatalogRecipe, imageUri: string) => {
      const key = String(item.nama || '').trim().toLowerCase();
      if (!key || savedNames[key] || savingName) return;
      try {
        setSavingName(key);
        await api('/api/recipes/save', {
          method: 'POST',
          body: JSON.stringify({ ...item, image_url: imageUri }),
        });
        setSavedNames((prev) => ({ ...prev, [key]: true }));
        setSavedModalVisible(true);
      } catch (err: any) {
        Alert.alert('Gagal menyimpan', err?.message || 'Coba lagi ya.');
      } finally {
        setSavingName(null);
      }
    },
    [savedNames, savingName]
  );

  const recipes = useMemo(() => {
    let list = allRecipes;
    if (kategori) {
      const wanted = kategori.trim().toLowerCase();
      list = list.filter((r) => String(r.kategori || '').trim().toLowerCase() === wanted);
    }
    const needle = query.trim().toLowerCase();
    if (needle) {
      list = list.filter((r) => recipeMatchesQuery(r, needle));
    }
    return list;
  }, [allRecipes, kategori, query]);

  const openDetail = useCallback(
    (item: CatalogRecipe, imageUri: string) => {
      router.push({
        pathname: '/detail-resep',
        params: {
          resep: JSON.stringify({ ...item, image_url: imageUri }),
          source: 'catalog',
        },
      } as any);
    },
    [router]
  );

  const retryLoad = useCallback(() => {
    setLoading(true);
    setError('');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    fetchCatalog(controller.signal).finally(() => clearTimeout(timeoutId));
  }, [fetchCatalog]);

  const headerElement = (
    <View>
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
        {CATEGORIES.map((c) => {
          const active = kategori === c.label;
          return (
            <Pressable
              key={c.key}
              style={[styles.categoryItem, { width: CATEGORY_ITEM_W }]}
              onPress={() => setKategori((current) => (current === c.label ? null : c.label))}>
              <View style={[styles.categoryRing, active && styles.categoryRingOn]}>
                <Image
                  source={c.image}
                  style={{ width: CATEGORY_IMG, height: CATEGORY_IMG }}
                  contentFit="contain"
                />
              </View>
              <Text style={[styles.categoryLabel, active && styles.categoryLabelOn]} numberOfLines={2}>
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Kamu Mungkin Suka</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <FlatList
        data={recipes}
        keyExtractor={(item) => String(item.id)}
        initialNumToRender={8}
        windowSize={5}
        maxToRenderPerBatch={8}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: insets.top + SEARCH_TOP * s,
          paddingBottom: BAR_H + insets.bottom + 40 * s,
        }}
        ListHeaderComponent={headerElement}
        renderItem={({ item: r, index }) => {
          const imageKey = `${r.id}:${r.image_url}`;
          const imageFailed = Boolean(failedImages[imageKey]);
          const imageUri = imageFailed || !r.image_url ? getFallbackImage(index) : r.image_url;
          const savedKey = String(r.nama || '').trim().toLowerCase();
          const isSaved = Boolean(savedNames[savedKey]);
          return (
            <View style={[styles.cardBox, { width: boxW, marginHorizontal: 20 * s }]}>
              {/* Rangkuman (di belakang kartu utama, nempel kanan) */}
              <View style={[styles.summary, { width: sumW, height: mainH }]}>
                <View style={{ paddingLeft: overlap + 6 }}>
                  <Text style={styles.summaryTitle}>Rangkuman</Text>
                  <Text style={styles.summaryText} numberOfLines={4}>
                    {r.rangkuman}
                  </Text>

                  <View style={styles.metaRow}>
                    <Ionicons name="time-outline" size={11} color="#222" />
                    <Text style={styles.metaText}>{r.waktu_masak}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Ionicons name="people-outline" size={11} color="#222" />
                    <Text style={styles.metaText}>{r.porsi}</Text>
                  </View>

                  <Pressable
                    style={styles.cookBtn}
                    hitSlop={COOK_BTN_HIT_SLOP}
                    onPress={() => openDetail(r, imageUri)}>
                    <Text style={styles.cookBtnText}>Ayo Masak!</Text>
                  </Pressable>
                </View>
              </View>

              {/* Kartu utama */}
              <View style={[styles.mainCard, { width: mainW, height: mainH }]}>
                <Image
                  source={{ uri: imageUri }}
                  style={{ width: imgSize, height: imgSize, borderRadius: 10 }}
                  contentFit="cover"
                  onError={() => {
                    if (!imageFailed && r.image_url) {
                      setFailedImages((prev) => ({ ...prev, [imageKey]: true }));
                    }
                  }}
                />
                <View style={styles.mainInfo}>
                  <Text style={styles.recipeTitle} numberOfLines={1}>
                    {r.nama}
                  </Text>
                  <View style={styles.kcalBadge}>
                    <Ionicons name="flame" size={9} color="#E8590C" />
                    <Text style={styles.kcalText}>{formatKkal(r.kalori)}</Text>
                  </View>

                  <View style={styles.macroRow}>
                    <Macro kind="protein" value={r.protein} label="Protein" />
                    <Macro kind="fats" value={r.fats} label="Fats" />
                    <Macro kind="carbs" value={r.carbs} label="Carbs" />
                  </View>
                </View>

                <Pressable
                  style={styles.bookmarkBtn}
                  onPress={() => handleSaveRecipe(r, imageUri)}
                  hitSlop={8}>
                  <Ionicons
                    name={isSaved ? 'bookmark' : 'bookmark-outline'}
                    size={16}
                    color="#8DB63C"
                  />
                </Pressable>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color="#8DB63C" />
              <Text style={styles.empty}>Memuat resep...</Text>
            </View>
          ) : error ? (
            <View style={styles.loadingWrap}>
              <Text style={styles.empty}>{error}</Text>
              <Pressable style={styles.retryBtn} onPress={retryLoad}>
                <Text style={styles.retryText}>Muat Ulang</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.empty}>Resep tidak ditemukan</Text>
          )
        }
      />

      <SaveSuccessModal
        visible={savedModalVisible}
        onClose={() => setSavedModalVisible(false)}
        onViewSaved={() => {
          setSavedModalVisible(false);
          router.push('/save' as any);
        }}
      />

      <BottomBar current="search" />
    </View>
  );
}

function Macro({
  kind,
  value,
  label,
}: {
  kind: 'protein' | 'fats' | 'carbs';
  value: string;
  label: string;
}) {
  const pct = macroBarPercent(kind, value);
  return (
    <View style={styles.macro}>
      <View style={styles.macroTrack}>
        <View style={[styles.macroBar, { height: `${pct}%` }]} />
      </View>
      <View>
        <Text style={styles.macroValue}>{value}</Text>
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
  categoryRingOn: {
    backgroundColor: '#B7D96A',
    borderColor: '#5E8E16',
  },
  categoryLabel: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '500',
    color: '#111',
    textAlign: 'center',
  },
  categoryLabelOn: {
    fontWeight: '800',
    color: '#3E6E12',
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
  recipeTitle: { fontSize: 15, fontWeight: '700', color: '#111', paddingRight: 22 },
  bookmarkBtn: { position: 'absolute', top: 10, right: 10 },
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
  macro: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  macroTrack: {
    width: 4,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  macroBar: { width: '100%', borderRadius: 999, backgroundColor: '#84CC16' },
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

  empty: { textAlign: 'center', color: '#7A7A7A', marginTop: 12, fontSize: 13 },
  loadingWrap: { alignItems: 'center', marginTop: 24, paddingHorizontal: 24 },
  retryBtn: {
    marginTop: 12,
    backgroundColor: '#8DB63C',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  retryText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
});
