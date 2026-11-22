export type BahanTerdeteksi = {
  id?: string;
  name: string;
  confidence?: number;
};

export type RecipeDraft = {
  bahan_terdeteksi: BahanTerdeteksi[];
  target_kalori?: number;
  waktu_memasak?: number;
  jumlah_orang?: number;
  alat_terpilih?: string[];
};

export function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseDraft(raw: string | string[] | undefined): RecipeDraft {
  const text = firstParam(raw);
  if (!text) return { bahan_terdeteksi: [] };

  try {
    const data = JSON.parse(text);
    return {
      bahan_terdeteksi: Array.isArray(data?.bahan_terdeteksi) ? data.bahan_terdeteksi : [],
      target_kalori: typeof data?.target_kalori === 'number' ? data.target_kalori : undefined,
      waktu_memasak: typeof data?.waktu_memasak === 'number' ? data.waktu_memasak : undefined,
      jumlah_orang: typeof data?.jumlah_orang === 'number' ? data.jumlah_orang : undefined,
      alat_terpilih: Array.isArray(data?.alat_terpilih) ? data.alat_terpilih : undefined,
    };
  } catch {
    return { bahan_terdeteksi: [] };
  }
}

export function confidencePercent(value: number | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return value <= 1 ? Math.round(value * 100) : Math.round(value);
}
