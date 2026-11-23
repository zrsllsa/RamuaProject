
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomBar, BAR_H } from '@/components/bottom-bar';
import { api } from '@/lib/api';
import { getFallbackImage, macroBarPercent } from '@/lib/resep';

// Area sentuh tombol "Ayo Masak!" diperluas (±44px) tanpa mengubah layout
const COOK_BTN_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

// ---- route ----
const ROUTE_SEARCH = '/search';
const ROUTE_DETAIL = '/detail-resep';

// ---- tipe data ----
type RawSavedRecipe = Record<string, any>;

type SavedRecipe = {
  id: string;
  title: string;
  imageUrl: string;
  protein: string;
  fat: string;
  carbs: string;
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

function formatMacro(value: unknown): string {
  if (value === null || value === undefined || value === '' || value === '-') return '-';
  if (typeof value === 'number' && Number.isFinite(value)) return `${Math.round(value)} g`;
  const text = String(value).trim();
  if (!text || text === '-') return '-';
  return text.toLowerCase().includes('g') ? text : `${text} g`;
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
  const summary =
    String(raw?.rangkuman || raw?.summary || '').trim() ||
    `Resep ${title} siap dimasak kapan saja.`;

  return {
    id,
    title,
    imageUrl,
    protein: formatMacro(raw?.protein),
    fat: formatMacro(raw?.fats ?? raw?.fat),
    carbs: formatMacro(raw?.carbs),
    kcal: numberFrom(raw?.kalori ?? raw?.kcal),
    summary,
    time: formatTime(raw?.waktu_masak ?? raw?.waktu ?? raw?.time),
    servings: formatServings(raw?.porsi ?? raw?.servings),
    raw,
  };
}

export default function SaveScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const s = width / 390; // skala layar, samakan dengan home & search

  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [deleteTarget, setDeleteTarget] = useState<SavedRecipe | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadSaved = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await api<RawSavedRecipe[]>('/api/recipes/saved');
      const items = Array.isArray(list) ? list.map(mapSavedRecipe) : [];
      setSavedRecipes(items);
    } catch {
      // Biarkan daftar terakhir jika fetch gagal sementara
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSaved();
    }, [loadSaved])
  );

  // ---- ukuran kartu: kartu utama + rangkuman yang menyelip di baliknya ----
  const boxW = width - 40 * s; // lebar total
  const overlap = 26; // rangkuman menyelip di balik kartu utama
  const mainW = boxW * 0.7;
  const mainH = mainW * 0.5;
  const sumW = boxW - mainW + overlap;
  const imgSize = mainH * 0.82; // gambar persegi 1:1

  const confirmDelete = (item: SavedRecipe) => {
    setDeleteTarget(item);
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return;
    const target = deleteTarget;
    try {
      setDeleting(true);
      await api(`/api/recipes/saved/${encodeURIComponent(target.id)}`, {
        method: 'DELETE',
      });
      setSavedRecipes((prev) => prev.filter((r) => r.id !== target.id));
      setDeleteTarget(null);
    } catch (error: any) {
      Alert.alert('Gagal menghapus', error?.message || 'Coba lagi ya.');
    } finally {
      setDeleting(false);
    }
  };

  const openDetail = (item: SavedRecipe, imageUri: string) => {
    router.push({
      pathname: ROUTE_DETAIL,
      params: { resep: JSON.stringify({ ...item.raw, image_url: imageUri }) },
    } as any);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color="#111111" />
        </Pressable>
        <Text style={styles.headerTitle}>Resep yang Anda Simpan</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: 24 * s,
          paddingBottom: BAR_H + insets.bottom + 40 * s,
        }}>
        {isLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#8DB63C" />
          </View>
        ) : (
          <>
            {savedRecipes.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="bookmark-outline" size={64} color="#C7C7CC" />
                <Text style={styles.emptyTitle}>Belum Ada Resep Tersimpan</Text>
                <Text style={styles.emptySubtitle}>
                  Yuk, simpan resep favoritmu dari hasil pindai bahan atau halaman pencarian biar gampang dimasak kapan saja!
                </Text>
              </View>
            ) : (
              savedRecipes.map((r, index) => {
                const imageKey = `${r.id}:${r.imageUrl}`;
                const imageFailed = Boolean(failedImages[imageKey]);
                const imageUri = imageFailed ? getFallbackImage(index) : r.imageUrl;
                return (
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
                      </View>

                      <Pressable
                        style={styles.cookBtn}
                        hitSlop={COOK_BTN_HIT_SLOP}
                        onPress={() => openDetail(r, imageUri)}>
                        <Text style={styles.cookBtnText}>Ayo Masak!</Text>
                      </Pressable>
                    </View>

                    {/* Kartu utama */}
                    <View style={[styles.mainCard, { width: mainW, height: mainH }]}>
                      <Image
                        source={{ uri: imageUri }}
                        style={{ width: imgSize, height: imgSize, borderRadius: 10 }}
                        contentFit="cover"
                        onError={() => {
                          if (!imageFailed) {
                            setFailedImages((prev) => ({ ...prev, [imageKey]: true }));
                          }
                        }}
                      />
                      <View style={styles.mainInfo}>
                        <Text style={styles.recipeTitle} numberOfLines={1}>
                          {r.title}
                        </Text>
                        <View style={styles.kcalBadge}>
                          <Ionicons name="flame" size={9} color="#E8590C" />
                          <Text style={styles.kcalText}>{r.kcal} kkal</Text>
                        </View>

                        <View style={styles.macroRow}>
                          <Macro kind="protein" value={r.protein} label="Protein" />
                          <Macro kind="fats" value={r.fat} label="Fats" />
                          <Macro kind="carbs" value={r.carbs} label="Carbs" />
                        </View>
                      </View>

                      {/* Tombol hapus */}
                      <Pressable style={styles.trashBtn} onPress={() => confirmDelete(r)} hitSlop={8}>
                        <Ionicons name="trash" size={16} color="#111111" />
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}

            {/* Tombol tambah resep -> Search */}
            <Pressable
              style={[styles.addBtn, { marginHorizontal: 20 * s, height: 48 * s }]}
              onPress={() => router.push(ROUTE_SEARCH as any)}>
              <Ionicons name="add" size={16} color="#B5B5B5" />
              <Text style={styles.addText}>Tambah Resep</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      <Modal
        visible={deleteTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Hapus dari Resepmu</Text>
            <Text style={styles.modalSubtitle}>
              Yakin ingin menghapus &quot;{deleteTarget?.title}&quot; dari daftar resep tersimpan?
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelBtn}
                disabled={deleting}
                onPress={() => setDeleteTarget(null)}>
                <Text style={styles.modalCancelText}>Batal</Text>
              </Pressable>
              <Pressable
                style={styles.modalDeleteBtn}
                disabled={deleting}
                onPress={handleDelete}>
                <Text style={styles.modalDeleteText}>
                  {deleting ? 'Menghapus...' : 'Hapus'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <BottomBar current="save" />
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  backBtn: { width: 32, height: 32, justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111111' },

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
  trashBtn: { position: 'absolute', top: 10, right: 10 },

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
    position: 'absolute',
    bottom: -8,
    right: 12,
    backgroundColor: '#8DB63C',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cookBtnText: { fontSize: 7, fontWeight: '700', color: '#FFFFFF' },

  // Tombol tambah resep
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#C9C9D6',
    borderRadius: 14,
    marginTop: 4,
  },
  addText: { fontSize: 13, color: '#B5B5B5' },

  // State loading / kosong
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  emptyTitle: {
    marginTop: 14,
    fontSize: 17,
    fontWeight: '800',
    color: '#161616',
    textAlign: 'center',
  },
  emptySubtitle: {
    marginTop: 8,
    maxWidth: 280,
    fontSize: 13,
    lineHeight: 19,
    color: '#8E8E93',
    textAlign: 'center',
  },

  // Modal hapus
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingVertical: 24,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#161616',
    textAlign: 'center',
  },
  modalSubtitle: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: '#6E6E6E',
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#8DB63C',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: { fontSize: 14, fontWeight: '800', color: '#8DB63C' },
  modalDeleteBtn: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#E23B3B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDeleteText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
});
