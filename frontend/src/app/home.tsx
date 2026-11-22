import { api } from '@/lib/api';
import { getFallbackImage, macroBarPercent } from '@/lib/resep';
import { supabase } from '@/lib/supabase';
import { BAR_H, BottomBar } from '@/components/bottom-bar';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Extrapolation,
  SharedValue,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ====== GAMBAR (semua di assets/images/home/) — ganti ekstensi DI SINI SAJA ======
const IMG = {
  home1: require('@/assets/images/home/home01.svg'), // gambar dapur (header)
  home00: require('@/assets/images/home/home00.png'), // card banner "Sekali Jepret"
  home2: require('@/assets/images/home/home2.svg'), // ilustrasi maskot di atas banner
  home3: require('@/assets/images/home/home3.svg'), // shape putih
  home5: require('@/assets/images/home/home5.svg'), // fitur: rekomendasi resep
  home6: require('@/assets/images/home/home6.svg'), // fitur: pindai otomatis
  home8: require('@/assets/images/home/home8.png'), // fitur: simpan resep favorit
  home7: require('@/assets/images/home/home7.jpg'), // foto resep tersimpan
  btnSearch: require('@/assets/expo.icon/btn-search.svg'), // ikon bulat search
};
// ==================================================================================

// ====== KATEGORI POPULER (bisa dipencet -> halaman search + filter) ======
const CATEGORIES = [
  { key: 'menu-satset', label: 'Menu Satset', image: require('@/assets/images/home/makanan1.svg') },
  { key: 'makan-besar', label: 'Makan Besar', image: require('@/assets/images/home/makanan2.svg') },
  { key: 'sup-kuah', label: 'Sup & Kuah', image: require('@/assets/images/home/makanan3.svg') },
  { key: 'cemilan', label: 'Cemilan', image: require('@/assets/images/home/makanan4.svg') },
  { key: 'fit-diet', label: 'Fit & Diet', image: require('@/assets/images/home/makanan5.svg') },
];
// ==========================================================================

// true = ilustrasi maskot (home02) ditumpuk di atas home00. Set false kalau home00 sudah memuat maskot.
const SHOW_BANNER_ART = true;

// ====== UKURAN (px desain Figma, lebar 375) — SETEL DI SINI ======
const HEADER_H = 330; // tinggi gambar dapur (home1)
const GREETING_TOP = 140; // posisi tulisan "Halo, ..."
const SEARCH_TOP = 230; // posisi bar pencarian
const SEARCH_H = 45; // tinggi bar pencarian
const SHAPE_OVERLAP = 42; // seberapa naik shape putih menimpa gambar dapur
const SHAPE_CAP_H = 120; // tinggi shape putih (home3)
const BANNER_H = 125; // tinggi card banner (home00)
const BANNER_RADIUS = 22; // kelengkungan ujung banner
const CATEGORY_IMG = 50; // ukuran gambar kategori (makanan1-5), makin kecil makin renggang
const CATEGORY_ITEM_W = 58; // lebar tiap kolom kategori (gambar + tulisan)
const PANEL_SMALL = 46; // tinggi panel putih di kartu samping (judul saja)
const PANEL_BIG = 112; // tinggi panel di kartu depan (judul + detail + tombol)
const PANEL_OPACITY = 0.5; // transparansi panel putih (0.5 = 50%)
// ==================================================================

const GREEN = '#8DB84A';

// ====== ROUTE TUJUAN — sesuaikan dengan nama file halamanmu ======
const ROUTE_SEARCH = '/search';
const ROUTE_SCAN = '/scan'; // halaman kamera pindai bahan
const ROUTE_SAVED = '/save'; // save.tsx
const ROUTE_DETAIL = '/detail-resep'; // detail-resep.tsx
// ==================================================================

type Feature = {
  id: string;
  title: string;
  desc: string;
  button: string;
  image: any;
  route: string;
};

const FEATURES: Feature[] = [
  {
    id: 'rekomendasi',
    title: 'Rekomendasi Resep',
    desc: 'Dapatkan ide resep yang cocok dengan bahan dan alat dapur yang kamu punya.',
    button: 'Lihat Resep',
    image: IMG.home5,
    route: ROUTE_SEARCH,
  },
  {
    id: 'pindai',
    title: 'Pindai Otomatis',
    desc: 'Cukup foto bahan makanan, sistem langsung mengenali semuanya secara otomatis.',
    button: 'Pindai Sekarang',
    image: IMG.home6,
    route: ROUTE_SCAN,
  },
  {
    id: 'favorit',
    title: 'Simpan Resep Favorite',
    desc: 'Simpan resep pilihan secara praktis untuk kamu akses cepat sesuai jadwal memasakmu.',
    button: 'Lihat Favorit',
    image: IMG.home8,
    route: ROUTE_SAVED,
  },
];

// Kartu yang paling depan saat halaman home dibuka (0 = pertama, 1 = tengah, dst.)
const DEFAULT_FEATURE_INDEX = 1; // "Pindai Otomatis"

type RawSavedRecipe = Record<string, any>;

type SavedRecipe = {
  id: string;
  title: string;
  imageUrl: string;
  protein: number;
  fat: number;
  carbs: number;
  kcal: number;
  summary: string;
  time: string;
  servings: string;
  raw: RawSavedRecipe;
};

function numberFrom(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  if (typeof value === 'string') {
    const match = value.match(/(\d+(?:[.,]\d+)?)/);
    if (match) {
      const n = Number(match[1].replace(',', '.'));
      if (Number.isFinite(n)) return Math.round(n);
    }
  }
  return fallback;
}

function formatTime(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return `${Math.round(value)} Menit`;
  }
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text || text === '-') return '-';
  return /^\d+$/.test(text) ? `${text} Menit` : text;
}

function formatServings(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return `${Math.round(value)} Orang`;
  }
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text || text === '-') return '2 Orang';
  return /^\d+$/.test(text) ? `${text} Orang` : text;
}

function mapSavedRecipe(raw: RawSavedRecipe, index: number): SavedRecipe {
  const title = String(raw?.nama || raw?.title || raw?.name || raw?.judul || `Resep ${index + 1}`).trim();
  const id = String(raw?.id || title || index);
  const imageUrl = String(raw?.image_url || raw?.gambar || raw?.image || '').trim() || getFallbackImage(index);
  const protein = numberFrom(raw?.protein);
  const fat = numberFrom(raw?.fats ?? raw?.fat);
  const carbs = numberFrom(raw?.carbs);
  const kcal = numberFrom(
    raw?.kalori ?? raw?.kcal,
    Math.round(protein * 4 + carbs * 4 + fat * 9)
  );
  const summary =
    String(raw?.rangkuman || raw?.summary || '').trim() ||
    `Resep ${title} siap dimasak kapan saja.`;

  return {
    id,
    title,
    imageUrl,
    protein,
    fat,
    carbs,
    kcal,
    summary,
    time: formatTime(raw?.waktu_masak ?? raw?.waktu ?? raw?.time),
    servings: formatServings(raw?.porsi ?? raw?.servings),
    raw,
  };
}

// ====== kartu "Fitur Kami": persegi 1:1, panel bawah memanjang di kartu depan ======
function FeatureCard({
  item,
  index,
  scrollX,
  step,
  cardW,
  s,
  active,
  onPressCard,
  onPressButton,
}: {
  item: Feature;
  index: number;
  scrollX: SharedValue<number>;
  step: number;
  cardW: number;
  s: number;
  active: boolean;
  onPressCard: () => void;
  onPressButton: () => void;
}) {
  // Panel putih di bawah: pendek di samping, tinggi di depan
  const panelStyle = useAnimatedStyle(() => {
    const range = [(index - 0.6) * step, index * step, (index + 0.6) * step];
    return {
      height: interpolate(
        scrollX.value,
        range,
        [PANEL_SMALL * s, PANEL_BIG * s, PANEL_SMALL * s],
        Extrapolation.CLAMP
      ),
    };
  });

  // Deskripsi + tombol muncul hanya di kartu depan
  const detailStyle = useAnimatedStyle(() => {
    const range = [(index - 0.4) * step, index * step, (index + 0.4) * step];
    return {
      opacity: interpolate(scrollX.value, range, [0, 1, 0], Extrapolation.CLAMP),
      transform: [
        { translateY: interpolate(scrollX.value, range, [10, 0, 10], Extrapolation.CLAMP) },
      ],
    };
  });

  // Kartu samping sedikit lebih pudar (ukuran tetap sama)
  const cardStyle = useAnimatedStyle(() => {
    const range = [(index - 1) * step, index * step, (index + 1) * step];
    return {
      opacity: interpolate(scrollX.value, range, [0.7, 1, 0.7], Extrapolation.CLAMP),
    };
  });

  return (
    <Pressable onPress={onPressCard}>
      <Animated.View style={[styles.featureCard, { width: cardW, height: cardW }, cardStyle]}>
        <Image
          source={item.image}
          style={{ position: 'absolute', top: 0, left: 0, width: cardW, height: cardW }}
          contentFit="cover"
        />

        {/* Panel putih transparan 50%: judul selalu ada, detail ikut terbuka di kartu depan */}
        <Animated.View
          style={[
            styles.featurePanel,
            { backgroundColor: `rgba(255,255,255,${PANEL_OPACITY})` },
            panelStyle,
          ]}>
          <Text style={styles.featureTitle}>{item.title}</Text>
          <Animated.View
            style={[styles.featureDetail, detailStyle]}
            pointerEvents={active ? 'auto' : 'none'}>
            <Text style={styles.featureDesc} numberOfLines={3}>
              {item.desc}
            </Text>
            <TouchableOpacity style={styles.featureBtn} activeOpacity={0.85} onPress={onPressButton}>
              <Text style={styles.featureBtnText}>{item.button}</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

// ====== batang nutrisi (protein / lemak / karbo) ======
function Nutri({
  kind,
  value,
  label,
}: {
  kind: 'protein' | 'fats' | 'carbs';
  value: number;
  label: string;
}) {
  const pct = macroBarPercent(kind, value);
  return (
    <View style={styles.nutri}>
      <View style={styles.nutriTrack}>
        <View style={[styles.nutriFill, { height: `${pct}%` }]} />
      </View>
      <View>
        <Text style={styles.nutriVal}>{value} g</Text>
        <Text style={styles.nutriLabel}>{label}</Text>
      </View>
    </View>
  );
}

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const s = width / 375;

  const [name, setName] = useState('');
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // ---- nama panggilan user (dari data saat daftar) ----
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      const raw =
        u?.user_metadata?.nickname ||
        u?.user_metadata?.full_name ||
        u?.email?.split('@')[0] ||
        '';
      setName(raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : '');
    });
  }, []);

  // ---- resep tersimpan dari FastAPI (sinkron saat halaman fokus) ----
  useFocusEffect(
    useCallback(() => {
      let active = true;
      api<RawSavedRecipe[]>('/api/recipes/saved')
        .then((list) => {
          if (!active) return;
          setSavedRecipes(Array.isArray(list) ? list.map(mapSavedRecipe) : []);
        })
        .catch(() => {
          if (!active) return;
          setSavedRecipes([]);
        });
      return () => {
        active = false;
      };
    }, [])
  );

  // ---- carousel "Fitur Kami" (kartu persegi) ----
  const cardW = width * 0.62;
  const gap = 14;
  const step = cardW + gap;
  const sidePad = (width - cardW) / 2;
  const scrollX = useSharedValue(DEFAULT_FEATURE_INDEX * step);
  const [activeIdx, setActiveIdx] = useState(DEFAULT_FEATURE_INDEX);
  const carouselRef = useRef<any>(null);
  const opacity = 500;

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
    },
    onMomentumEnd: (e) => {
      runOnJS(setActiveIdx)(Math.round(e.contentOffset.x / step));
    },
  });

  const goToCard = (i: number) => {
    carouselRef.current?.scrollTo({ x: i * step, animated: true });
    setActiveIdx(i);
  };

  // Saat home dibuka, kartu tengah ("Pindai Otomatis") langsung di depan
  useEffect(() => {
    const t = setTimeout(() => {
      carouselRef.current?.scrollTo({ x: DEFAULT_FEATURE_INDEX * step, animated: false });
    }, 50);
    return () => clearTimeout(t);
  }, [step]);

  // ---- kartu "Resep yang anda Simpan": maks 3 kartu terbaru ----
  const visibleSaved = savedRecipes.slice(0, 3);
  const savedBoxW = width - 40 * s; // lebar total (kartu utama + rangkuman)
  const savedOverlap = 26; // rangkuman menyelip di balik kartu utama
  const savedMainW = savedBoxW * 0.68;
  const savedMainH = Math.max(126, savedMainW * 0.54);
  const savedSumW = savedBoxW - savedMainW + savedOverlap;
  const savedImgSize = savedMainH * 0.72; // gambar resep persegi 1:1 agar area makro lega

  const openSavedDetail = (item: SavedRecipe, imageUri: string) => {
    router.push({
      pathname: ROUTE_DETAIL,
      params: { resep: JSON.stringify({ ...item.raw, image_url: imageUri }) },
    } as any);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: BAR_H + insets.bottom + 40 * s }}>


        <View style={{ height: (HEADER_H - SHAPE_OVERLAP) * s }}>
          <Image
            source={IMG.home1}
            style={{ position: 'absolute', top: 0, left: 0, width, height: HEADER_H * s }}
            contentFit="cover"
            contentPosition="top"
          />

          <Text style={[styles.greeting, { top: GREETING_TOP * s }]}>
            Halo, {name || 'Teman'}!
          </Text>

          {/* Bar pencarian -> halaman search */}
          <Pressable
            onPress={() => router.push(ROUTE_SEARCH as any)}
            style={[
              styles.searchBar,
              { top: SEARCH_TOP * s, left: 24 * s, right: 24 * s, height: SEARCH_H * s },
            ]}>
            <Image source={IMG.btnSearch} style={styles.searchIcon} contentFit="contain" />
            <Text style={styles.searchText}>Apa yang ingin anda ramu hari ini?</Text>
            <Ionicons name="options-outline" size={20} color="#6B6B6B" />
          </Pressable>
        </View>

        {/* ===== BAGIAN PUTIH (home3) ===== */}
        <View>
          <Image
            source={IMG.home3}
            style={{ position: 'absolute', top: 0, left: 0, width, height: SHAPE_CAP_H * s }}
            contentFit="cover"
            contentPosition="top"
          />
          <View
            style={{
              position: 'absolute',
              top: (SHAPE_CAP_H - 1) * s,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: '#FFFFFF',
            }}
          />

          <View style={{ paddingTop: 0 * s }}>
            {/* Banner (gambar home00, ujung melengkung) -> pindai bahan. Tulisan + tombol tetap di atas gambar. */}
            <Pressable
              onPress={() => router.push(ROUTE_SCAN as any)}
              style={{ marginHorizontal: 20 * s, marginTop: 23 * s, height: BANNER_H * s }}>
              <Image
                source={IMG.home00}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: width - 40 * s,
                  height: BANNER_H * s,
                  borderRadius: BANNER_RADIUS,
                }}
                contentFit="cover"
              />

              {/* Ilustrasi transparan ditimpa di atas banner */}

              <View
                style={{ flex: 1, paddingLeft: 16 * s, justifyContent: 'center', width: '55%' }}>
                <Text style={styles.bannerTitle}>Sekali Jepret,{'\n'}Resep Dapet!</Text>
                <Text style={styles.bannerDesc} numberOfLines={2}>
                  Foto bahan di dapurmu, biar sistem yang racik menunya.
                </Text>
                <View style={styles.bannerBtn}>
                  <Text style={styles.bannerBtnText}>Pindai bahan</Text>
                </View>
              </View>
            </Pressable>

            {/* Kategori Populer (bisa dipencet -> search + filter) */}
            <Text style={[styles.sectionTitle, { marginTop: 24 * s }]}>Kategori Populer</Text>
            <View style={[styles.catRow, { marginHorizontal: 20 * s, marginTop: 10 * s }]}>
              {CATEGORIES.map((c) => (
                <Pressable
                  key={c.key}
                  style={{ width: CATEGORY_ITEM_W * s, alignItems: 'center' }}
                  onPress={() =>
                    router.push({
                      pathname: ROUTE_SEARCH,
                      params: { kategori: c.key, label: c.label },
                    } as any)
                  }>
                  <Image
                    source={c.image}
                    style={{ width: CATEGORY_IMG * s, height: CATEGORY_IMG * s }}
                    contentFit="contain"
                  />
                  <Text style={styles.catLabel} numberOfLines={1}>
                    {c.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Fitur Kami (geser kiri-kanan, kartu persegi) */}
            <Text style={[styles.sectionTitle, { marginTop: 24 * s }]}>Fitur Kami</Text>
            <Animated.ScrollView
              ref={carouselRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={step}
              decelerationRate="fast"
              scrollEventThrottle={16}
              onScroll={onScroll}
              contentOffset={{ x: DEFAULT_FEATURE_INDEX * step, y: 0 }}
              contentContainerStyle={{
                paddingHorizontal: sidePad,
                paddingVertical: 8,
                gap,
              }}
              style={{ marginTop: 16 * s }}>
              {FEATURES.map((f, i) => (
                <FeatureCard
                  key={f.id}
                  item={f}
                  index={i}
                  scrollX={scrollX}
                  step={step}
                  cardW={cardW}
                  s={s}
                  active={activeIdx === i}
                  onPressCard={() => goToCard(i)}
                  onPressButton={() => router.push(f.route as any)}
                />
              ))}
            </Animated.ScrollView>

            {/* Resep yang Anda Simpan */}
            <View style={[styles.savedHeaderRow, { marginTop: 20 * s, marginHorizontal: 20 * s }]}>
              <Text style={[styles.sectionTitle, { marginHorizontal: 0 }]}>
                Resep yang anda Simpan
              </Text>
              {savedRecipes.length > 3 ? (
                <Pressable onPress={() => router.push(ROUTE_SAVED as any)} hitSlop={8}>
                  <Text style={styles.seeAllText}>Lihat Semua ({savedRecipes.length})</Text>
                </Pressable>
              ) : null}
            </View>

            {savedRecipes.length === 0 ? (
              <View style={[styles.savedEmptyCard, { marginHorizontal: 20 * s, marginTop: 10 * s }]}>
                <View style={styles.savedEmptyIcon}>
                  <Ionicons name="bookmark-outline" size={26} color={GREEN} />
                </View>
                <Text style={styles.savedEmptyTitle}>Belum ada resep yang disimpan</Text>
                <Text style={styles.savedEmptyDesc}>
                  Simpan resep favoritmu dari hasil pindai atau pencarian agar mudah dimasak kapan saja.
                </Text>
                <TouchableOpacity
                  style={styles.savedEmptyBtn}
                  activeOpacity={0.85}
                  onPress={() => router.push(ROUTE_SEARCH as any)}>
                  <Text style={styles.savedEmptyBtnText}>Jelajahi Resep</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {visibleSaved.map((item, idx) => {
                  const imageKey = `${item.id}:${item.imageUrl}`;
                  const imageFailed = Boolean(failedImages[imageKey]);
                  const imageUri = imageFailed ? getFallbackImage(idx) : item.imageUrl;
                  return (
                    <View
                      key={item.id}
                      style={{
                        width: savedBoxW,
                        marginHorizontal: 20 * s,
                        marginTop: idx === 0 ? 10 * s : 4,
                        marginBottom: 16,
                        height: savedMainH,
                      }}>
                      {/* Panel Rangkuman: menyembul di balik kartu utama, tidak melebihi layar */}
                      <View
                        style={[
                          styles.summary,
                          {
                            width: savedSumW,
                            height: savedMainH,
                            paddingLeft: savedOverlap + 8,
                          },
                        ]}>
                        <View>
                          <Text style={styles.summaryTitle}>Rangkuman</Text>
                          <Text style={styles.summaryDesc} numberOfLines={2}>
                            {item.summary}
                          </Text>
                        </View>

                        <View>
                          <View style={styles.summaryRow}>
                            <Ionicons name="time-outline" size={11} color="#222222" />
                            <Text style={styles.summaryText} numberOfLines={1}>
                              {item.time}
                            </Text>
                          </View>
                          <View style={styles.summaryRow}>
                            <Ionicons name="people-outline" size={11} color="#222222" />
                            <Text style={styles.summaryText} numberOfLines={1}>
                              {item.servings}
                            </Text>
                          </View>
                        </View>

                        <TouchableOpacity
                          style={styles.cookBtn}
                          activeOpacity={0.85}
                          onPress={() => openSavedDetail(item, imageUri)}>
                          <Text style={styles.cookBtnText} numberOfLines={1}>
                            Ayo Masak!
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* Kartu utama: foto 1:1, nama, kkal, protein / fats / carbs */}
                      <View style={[styles.savedMain, { width: savedMainW, height: savedMainH }]}>
                        <Image
                          source={{ uri: imageUri }}
                          style={[styles.savedImg, { width: savedImgSize, height: savedImgSize }]}
                          contentFit="cover"
                          onError={() => {
                            if (!imageFailed) {
                              setFailedImages((prev) => ({ ...prev, [imageKey]: true }));
                            }
                          }}
                        />
                        <View style={styles.savedInfo}>
                          <Text style={styles.savedTitle} numberOfLines={1}>
                            {item.title}
                          </Text>
                          <View style={styles.kcalPill}>
                            <Ionicons name="flame" size={9} color="#E8590C" />
                            <Text style={styles.kcalText}>{item.kcal} kkal</Text>
                          </View>
                          <View style={styles.nutriRow}>
                            <Nutri kind="protein" value={item.protein} label="Protein" />
                            <Nutri kind="fats" value={item.fat} label="Fats" />
                            <Nutri kind="carbs" value={item.carbs} label="Carbs" />
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })}

                {savedRecipes.length > 3 ? (
                  <Pressable
                    style={[styles.seeAllOutlineBtn, { marginHorizontal: 20 * s }]}
                    onPress={() => router.push(ROUTE_SAVED as any)}>
                    <Text style={styles.seeAllOutlineText}>Lihat Semua Resep Tersimpan</Text>
                    <Ionicons name="chevron-forward" size={15} color={GREEN} />
                  </Pressable>
                ) : null}
              </>
            )}
          </View>
        </View>
      </ScrollView>

      {/* ===== TAB BAR BAWAH (file terpisah: src/components/bottom-bar.tsx) ===== */}
      <BottomBar current="home" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  greeting: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    color: '#1B1B1B',
  },

  // Bar pencarian
  searchBar: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingLeft: 5,
    paddingRight: 16,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  searchIcon: { width: 38, height: 38 },
  searchText: { flex: 1, marginLeft: 10, fontSize: 13, color: '#7A7A7A' },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111111',
    marginHorizontal: 20,
  },

  // Banner
  bannerTitle: { fontSize: 18, fontWeight: '800', color: '#1B1B1B', lineHeight: 22 },
  bannerDesc: { fontSize: 10, color: '#3B4A8A', marginTop: 6, lineHeight: 14 },
  bannerBtn: {
    alignSelf: 'flex-start',
    marginTop: 10,
    backgroundColor: GREEN,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  bannerBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },

  // Kategori populer
  catRow: { flexDirection: 'row', justifyContent: 'space-between' },
  catLabel: { fontSize: 9.5, color: '#222222', textAlign: 'center', marginTop: 4 },

  // Fitur Kami
  featureCard: {
    backgroundColor: '#E6F0CF', // latar sementara kalau gambar belum masuk
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  featurePanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingTop: 10,
    alignItems: 'center',
  },
  featureTitle: { fontSize: 13, fontWeight: '800', color: '#111111', textAlign: 'center' },
  featureDetail: { marginTop: 4, alignItems: 'center' },
  featureDesc: { fontSize: 10.5, lineHeight: 14, color: '#222222', textAlign: 'center' },
  featureBtn: {
    marginTop: 7,
    backgroundColor: GREEN,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 18,
  },
  featureBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  // Resep tersimpan — kartu utama
  savedMain: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#D5E58F',
    zIndex: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  savedImg: { borderRadius: 10 },
  savedInfo: { flex: 1, marginLeft: 8, justifyContent: 'center' },
  savedTitle: { fontSize: 15, fontWeight: '700', color: '#111111' },
  kcalPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
    backgroundColor: '#FFE7C2',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  kcalText: { fontSize: 7.5, fontWeight: '600', color: '#B45309' },
  nutriRow: { flexDirection: 'row', gap: 5, marginTop: 8 },
  nutri: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  nutriTrack: {
    width: 4,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  nutriFill: { width: '100%', borderRadius: 999, backgroundColor: '#84CC16' },
  nutriVal: { fontSize: 10.5, fontWeight: '700', color: '#111111' },
  nutriLabel: { fontSize: 7, color: '#6B6B6B' },

  // Resep tersimpan — panel rangkuman
  summary: {
    position: 'absolute',
    right: 0,
    top: 0,
    flexDirection: 'column',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingRight: 8,
    backgroundColor: '#B9BDE8',
    borderRadius: 18,
    zIndex: 1,
  },
  summaryTitle: { fontSize: 10, fontWeight: '700', color: '#2B2F77' },
  summaryDesc: { fontSize: 6.5, lineHeight: 9, color: '#2B2F77', marginTop: 2 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  summaryText: { fontSize: 7.5, color: '#222222', flexShrink: 1 },
  cookBtn: {
    alignSelf: 'flex-start',
    backgroundColor: GREEN,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  cookBtnText: { color: '#FFFFFF', fontSize: 8.5, fontWeight: '700' },

  // Empty state & header resep tersimpan
  savedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: GREEN,
  },
  seeAllOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: GREEN,
    borderRadius: 999,
    paddingVertical: 10,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  seeAllOutlineText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: GREEN,
  },
  savedEmptyCard: {
    alignItems: 'center',
    backgroundColor: '#F8FBF3',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#D8E68A',
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 16,
  },
  savedEmptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EAF5D4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedEmptyTitle: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '800',
    color: '#161616',
    textAlign: 'center',
  },
  savedEmptyDesc: {
    marginTop: 4,
    fontSize: 11.5,
    lineHeight: 16,
    color: '#6E6E6E',
    textAlign: 'center',
    maxWidth: 270,
  },
  savedEmptyBtn: {
    marginTop: 14,
    backgroundColor: GREEN,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  savedEmptyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});