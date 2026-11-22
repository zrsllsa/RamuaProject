import { firstParam } from '@/lib/recipe-flow';

export const FALLBACK_FOOD_IMAGES = [
  'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=800&auto=format&fit=crop',
] as const;

export const PLACEHOLDER_IMAGE = FALLBACK_FOOD_IMAGES[0];

export function getFallbackImage(index = 0): string {
  return FALLBACK_FOOD_IMAGES[Math.abs(index) % FALLBACK_FOOD_IMAGES.length];
}

export function extractNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const match = value.match(/(\d+(?:[.,]\d+)?)/);
    if (match) {
      const n = Number(match[1].replace(',', '.'));
      if (Number.isFinite(n)) return n;
    }
  }
  return fallback;
}

export function macroBarPercent(kind: 'protein' | 'fats' | 'carbs', value: unknown): number {
  const grams = Math.max(0, extractNumber(value, 0));
  const maxRef = kind === 'protein' ? 50 : kind === 'fats' ? 35 : 80;
  return Math.min(100, Math.max(15, Math.round((grams / maxRef) * 100)));
}

export function formatKkal(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `${Math.round(value)} kkal`;
  }
  const text = String(value ?? '').trim();
  if (!text) return '0 kkal';
  if (/kcal/i.test(text)) return text.replace(/kcal/gi, 'kkal');
  if (/kkal/i.test(text)) return text;
  const n = extractNumber(text, 0);
  return `${Math.round(n)} kkal`;
}

export type BahanResep = {
  nama: string;
  takaran: string;
  ada: boolean;
};

export type LangkahResep = {
  judul: string;
  waktu: string;
  deskripsi: string;
  bahan: string[];
};

export type ResepItem = {
  id: string;
  nama: string;
  gambar: string;
  kalori: number;
  waktu: number;
  alat: string[];
  kecocokan: number;
  bahanCocok: number;
  bahanTotal: number;
  bahanKurang: string[];
  labelKalori: string;
  porsi: number;
  bahan: BahanResep[];
  langkah: LangkahResep[];
  bumbuDasar: string;
  mentah: Record<string, unknown>;
};

function textOf(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function numberOf(value: unknown, fallback = 0) {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function amountOf(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const match = value.match(/(\d+(?:[.,]\d+)?)/);
    if (match) {
      const n = Number(match[1].replace(',', '.'));
      if (Number.isFinite(n)) return n;
    }
  }
  return numberOf(value, fallback);
}

function textList(value: unknown): string[] {
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return listOf(value)
    .map((entry: any) => (typeof entry === 'string' ? entry : textOf(entry?.nama || entry?.name)))
    .filter(Boolean);
}

function listOf(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

export function scaleTakaran(takaran: string, base: number, next: number) {
  const match = takaran.trim().match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (!match || base <= 0 || next === base) return takaran;
  const amount = parseFloat(match[1].replace(',', '.'));
  if (!Number.isFinite(amount)) return takaran;
  const scaled = (amount * next) / base;
  const rounded = Math.round(scaled * 10) / 10;
  const shown = Number.isInteger(rounded) ? String(rounded) : String(rounded);
  return match[2] ? `${shown} ${match[2]}` : shown;
}

export function parseResepList(raw: string | string[] | undefined): ResepItem[] {
  const text = firstParam(raw);
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    const list = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
    return list.map(normalizeResep);
  } catch {
    return [];
  }
}

export function parseResep(raw: string | string[] | undefined): ResepItem | null {
  const list = parseResepList(raw);
  return list[0] ?? null;
}

export function normalizeResep(item: any, index = 0): ResepItem {
  const nama = textOf(item?.nama || item?.name || item?.title || item?.judul, `Resep ${index + 1}`);
  const gambar = textOf(item?.gambar || item?.image || item?.image_url || item?.foto);
  const bahanMentah = listOf(
    item?.bahan || item?.ingredients || item?.bahan_resep || item?.bahan_dibutuhkan
  );
  const bahan: BahanResep[] = bahanMentah.map((bahanItem: any) => {
    if (typeof bahanItem === 'string') return { nama: bahanItem, takaran: '', ada: true };
    const status = typeof bahanItem?.status === 'string' ? bahanItem.status.toLowerCase() : '';
    const ada = bahanItem?.ada ?? bahanItem?.tersedia ?? bahanItem?.available;
    return {
      nama: textOf(bahanItem?.nama || bahanItem?.name, 'Bahan'),
      takaran: textOf(bahanItem?.takaran || bahanItem?.jumlah || bahanItem?.amount),
      ada: status ? status !== 'kurang' : ada !== false && ada !== 'kurang',
    };
  });
  const langkahMentah = listOf(item?.langkah || item?.steps || item?.instruksi || item?.langkah_memasak);
  const langkah: LangkahResep[] = langkahMentah.map((step: any, stepIndex: number) => {
    if (typeof step === 'string') {
      return { judul: `Langkah ${stepIndex + 1}`, waktu: '', deskripsi: step, bahan: [] };
    }
    const bahanLangkah = listOf(
      step?.bahan || step?.ingredients || step?.bahan_digunakan || step?.bahan_terkait
    ).map((entry: any) => (typeof entry === 'string' ? entry : textOf(entry?.nama || entry?.name, 'Bahan')));
    const waktuMenit = step?.waktu_menit;
    return {
      judul: textOf(step?.judul || step?.nama || step?.title, `Langkah ${stepIndex + 1}`),
      waktu: textOf(step?.waktu || step?.time || step?.durasi) || (waktuMenit ? `${waktuMenit} menit` : ''),
      deskripsi: textOf(step?.deskripsi || step?.description || step?.cara),
      bahan: bahanLangkah,
    };
  });
  const dariBahan = bahan.filter((entry) => !entry.ada).map((entry) => entry.nama);
  const hasBahan = bahan.length > 0;
  const bahanKurang = listOf(item?.bahan_kurang || item?.kurang).map((entry: any) =>
    typeof entry === 'string' ? entry : textOf(entry?.nama || entry?.name)
  ).filter(Boolean);
  const kurang = hasBahan ? dariBahan : bahanKurang;
  const bahanTotal = hasBahan
    ? bahan.length
    : numberOf(item?.bahan_total ?? item?.total_bahan, kurang.length);
  const bahanCocok = hasBahan
    ? bahanTotal - kurang.length
    : numberOf(item?.bahan_cocok ?? item?.cocok, Math.max(0, bahanTotal - kurang.length));
  const kecocokanMentah = item?.kecocokan ?? item?.match ?? item?.kecocokan_bahan;
  const kecocokan = hasBahan
    ? Math.round((bahanCocok / bahanTotal) * 100)
    : typeof kecocokanMentah === 'number'
      ? kecocokanMentah <= 1
        ? Math.round(kecocokanMentah * 100)
        : Math.round(kecocokanMentah)
      : 100;
  const alat = textList(item?.alat || item?.alat_masak || item?.tools || item?.alat_dipakai);

  return {
    id: String(item?.id ?? `${nama}-${index}`),
    nama,
    gambar,
    kalori: amountOf(item?.kalori ?? item?.kcal ?? item?.calories),
    waktu: amountOf(item?.waktu ?? item?.waktu_menit ?? item?.menit ?? item?.time ?? item?.waktu_masak),
    alat,
    kecocokan,
    bahanCocok,
    bahanTotal,
    bahanKurang: kurang,
    labelKalori: textOf(item?.label_kalori || item?.estimasi_kalori || item?.kalori_label, 'Sesuai preferensi'),
    porsi: amountOf(item?.porsi ?? item?.jumlah_orang ?? item?.servings, 2) || 2,
    bahan,
    langkah,
    bumbuDasar: Array.isArray(item?.bumbu_dasar)
      ? item.bumbu_dasar.map((entry: any) => String(entry)).filter(Boolean).join('  •  ')
      : textOf(item?.bumbu_dasar || item?.bumbuDasar, 'Garam secukupnya  •  Minyak 2 sdm'),
    mentah: item && typeof item === 'object' ? item : {},
  };
}
