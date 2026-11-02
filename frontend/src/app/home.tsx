import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { BAR_H, BottomBar } from '@/components/bottom-bar';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
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
const ROUTE_COOK = '/ayomasak'; // ayomasak.tsx
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

type SavedRecipe = {
  id: string;
  title: string;
  image_url?: string | null;
  protein: number;
  fat: number;
  carbs: number;
  kcal?: number; // kalau kosong, dihitung dari protein/lemak/karbo
  summary?: string; // teks "Rangkuman"
  time?: string; // contoh: "50 Menit"
  servings?: string; // contoh: "4-5 Orang"
};

// Data contoh kalau belum ada resep tersimpan / API belum siap
const SAMPLE_SAVED: SavedRecipe[] = [
  {
    id: 'sample',
    title: 'Steak',
    image_url: null,
    protein: 32,
    fat: 24,
    carbs: 20,
    kcal: 990,
    summary:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et',
    time: '50 Menit',
    servings: '4-5 Orang',
  },
];

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
function Nutri({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = Math.max(0.08, Math.min(1, value / max));
  return (
    <View style={styles.nutri}>
      <View style={styles.nutriTrack}>
        <LinearGradient
          colors={['#1F9D55', '#7ED69A']}
          style={[styles.nutriFill, { height: `${pct * 100}%` as any }]}
        />
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
  const [saved, setSaved] = useState<SavedRecipe[]>(SAMPLE_SAVED);

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

  // ---- resep tersimpan dari FastAPI (kalau gagal, pakai contoh) ----
  useEffect(() => {
    api<SavedRecipe[]>('/api/recipes/saved')
      .then((list) => {
        if (Array.isArray(list) && list.length > 0) setSaved(list);
      })
      .catch(() => {});
  }, []);

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

  // ---- kartu "Resep yang anda Simpan": satu kartu, pas selebar layar ----
  const featured = saved[0];
  const savedBoxW = width - 40 * s; // lebar total (kartu utama + rangkuman)
  const savedOverlap = 26; // rangkuman menyelip di balik kartu utama
  const savedMainW = savedBoxW * 0.7;
  const savedMainH = savedMainW * 0.5;
  const savedSumW = savedBoxW - savedMainW + savedOverlap;
  const savedImgSize = savedMainH * 0.82; // gambar resep persegi 1:1
  const kcal = featured
    ? featured.kcal ?? Math.round(featured.protein * 4 + featured.carbs * 4 + featured.fat * 9)
    : 0;

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

            {/* Resep yang Anda Simpan — satu kartu, tidak bisa digeser */}
            <Text style={[styles.sectionTitle, { marginTop: 20 * s }]}>Resep yang anda Simpan</Text>
            {featured && (
              <View
                style={{
                  width: savedBoxW,
                  marginHorizontal: 20 * s,
                  marginTop: 10 * s,
                  marginBottom: 18,
                  height: savedMainH,
                }}>
                {/* Panel Rangkuman: menyembul di balik kartu utama, tidak melebihi layar */}
                <View
                  style={[
                    styles.summary,
                    {
                      width: savedSumW,
                      height: savedMainH - 18 * s,
                      top: 10 * s,
                      paddingLeft: savedOverlap + 8,
                    },
                  ]}>
                  <Text style={styles.summaryTitle}>Rangkuman</Text>
                  <Text style={styles.summaryDesc} numberOfLines={3}>
                    {featured.summary ||
                      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et'}
                  </Text>
                  <View style={styles.summaryRow}>
                    <Ionicons name="time-outline" size={14} color="#2F3E8F" />
                    <Text style={styles.summaryText}>{featured.time || '50 Menit'}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Ionicons name="people" size={14} color="#2F3E8F" />
                    <Text style={styles.summaryText}>{featured.servings || '4-5 Orang'}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.cookBtn}
                    activeOpacity={0.85}
                    onPress={() =>
                      router.push({ pathname: ROUTE_COOK, params: { id: featured.id } } as any)
                    }>
                    <Text style={styles.cookBtnText}>Ayo Masak!</Text>
                  </TouchableOpacity>
                </View>

                {/* Kartu utama: foto 1:1, nama, kcal, protein / fats / carbs */}
                <View style={[styles.savedMain, { width: savedMainW, height: savedMainH }]}>
                  <Image
                    source={featured.image_url ? { uri: featured.image_url } : IMG.home7}
                    style={[styles.savedImg, { width: savedImgSize, height: savedImgSize }]}
                    contentFit="cover"
                  />
                  <View style={styles.savedInfo}>
                    <Text style={styles.savedTitle} numberOfLines={1}>
                      {featured.title}
                    </Text>
                    <View style={styles.kcalPill}>
                      <Ionicons name="flame" size={10} color="#E2552F" />
                      <Text style={styles.kcalText}>{kcal} kcal</Text>
                    </View>
                    <View style={styles.nutriRow}>
                      <Nutri value={featured.protein} max={90} label="Proteins" />
                      <Nutri value={featured.fat} max={70} label="Fats" />
                      <Nutri value={featured.carbs} max={300} label="Carbs" />
                    </View>
                  </View>
                </View>
              </View>
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
    padding: 7,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#D8E68A',
    zIndex: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  savedImg: { borderRadius: 14 },
  savedInfo: { flex: 1, paddingLeft: 10, justifyContent: 'center' },
  savedTitle: { fontSize: 18, fontWeight: '800', color: '#111111' },
  kcalPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
    backgroundColor: '#FCE08B',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  kcalText: { fontSize: 9, fontWeight: '800', color: '#D9532D' },
  nutriRow: { flexDirection: 'row', gap: 4, marginTop: 7 },
  nutri: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  nutriTrack: {
    width: 5,
    height: 38,
    borderRadius: 3,
    backgroundColor: '#E4E4E4',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  nutriFill: { width: '100%', borderRadius: 3 },
  nutriVal: { fontSize: 11.5, fontWeight: '800', color: '#111111' },
  nutriLabel: { fontSize: 7.5, color: '#555555' },

  // Resep tersimpan — panel rangkuman
  summary: {
    position: 'absolute',
    right: 0,
    paddingRight: 8,
    paddingTop: 9,
    backgroundColor: '#B9C1E8',
    borderRadius: 22,
    zIndex: 1,
  },
  summaryTitle: { fontSize: 14, fontWeight: '800', color: '#2F3E8F' },
  summaryDesc: { fontSize: 8.5, lineHeight: 11, color: '#111111', marginTop: 2 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  summaryText: { fontSize: 10, color: '#111111' },
  cookBtn: {
    position: 'absolute',
    right: 8,
    bottom: -14,
    backgroundColor: GREEN,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  cookBtnText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
});