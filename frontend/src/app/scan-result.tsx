import { StepIndicator } from '@/components/StepIndicator';
import { confidencePercent } from '@/lib/recipe-flow';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const GREEN = '#8FCB4C';
const LOW_MAX = 60;

type BBox = { x1: number; y1: number; x2: number; y2: number };

type Detection = {
  name?: string;
  class_name?: string;
  confidence?: number;
  bbox?: BBox;
};

type DetectResponse = {
  image_size?: { width?: number; height?: number };
  unique_ingredients?: string[];
  detections?: Detection[];
};

type Ingredient = {
  id: string;
  name: string;
  confidence: number;
};

type BoxItem = Ingredient & { bbox: BBox };

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseDetectData(raw: string | undefined): DetectResponse | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as DetectResponse;
    if (!data || typeof data !== 'object') return null;
    return data;
  } catch {
    return null;
  }
}

function buildState(data: DetectResponse | null) {
  const byName = new Map<string, number>();
  const boxes: BoxItem[] = [];

  (data?.detections ?? []).forEach((item, index) => {
    const name = (item.name || item.class_name || 'Bahan').trim();
    const confidence = typeof item.confidence === 'number' ? item.confidence : 0;
    const prev = byName.get(name);
    if (prev === undefined || confidence > prev) byName.set(name, confidence);
    if (item.bbox) {
      boxes.push({ id: `box-${index}`, name, confidence, bbox: item.bbox });
    }
  });

  for (const name of data?.unique_ingredients ?? []) {
    if (!byName.has(name)) byName.set(name, 1);
  }

  const ingredients: Ingredient[] = [...byName.entries()].map(([name, confidence], index) => ({
    id: `bahan-${index}`,
    name,
    confidence,
  }));

  return { ingredients, boxes };
}

export default function ScanResultScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, imageUri } = useLocalSearchParams();
  const rawUri = Array.isArray(imageUri) ? imageUri[0] : imageUri;
  const uriString = rawUri ? decodeURIComponent(rawUri) : null;

  console.log('URI Gambar dari params:', uriString);
  const detected = useMemo(() => parseDetectData(firstParam(data)), [data]);
  const initial = useMemo(() => buildState(detected), [detected]);

  const [ingredients, setIngredients] = useState<Ingredient[]>(initial.ingredients);
  const [boxes, setBoxes] = useState<BoxItem[]>(initial.boxes);
  const [frame, setFrame] = useState({ width: 0, height: 0 });
  const [editor, setEditor] = useState<{ id: string | null; name: string } | null>(null);

  const imageWidth = Number(detected?.image_size?.width) || 0;
  const imageHeight = Number(detected?.image_size?.height) || 0;
  const aspectRatio = imageWidth > 0 && imageHeight > 0 ? imageWidth / imageHeight : 3 / 4;
  const scaleX = imageWidth > 0 && frame.width > 0 ? frame.width / imageWidth : 0;
  const scaleY = imageHeight > 0 && frame.height > 0 ? frame.height / imageHeight : 0;
  const reviewCount = ingredients.filter((item) => confidencePercent(item.confidence) < LOW_MAX).length;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/scan' as any);
  };

  const removeIngredient = (item: Ingredient) => {
    setIngredients((prev) => prev.filter((row) => row.id !== item.id));
    setBoxes((prev) => prev.filter((box) => box.name !== item.name));
  };

  const saveEditor = () => {
    const name = editor?.name.trim() ?? '';
    if (!name) {
      Alert.alert('Nama kosong', 'Isi nama bahan terlebih dahulu.');
      return;
    }

    if (!editor?.id) {
      setIngredients((prev) => [...prev, { id: `manual-${Date.now()}`, name, confidence: 1 }]);
      setEditor(null);
      return;
    }

    const current = ingredients.find((item) => item.id === editor.id);
    setIngredients((prev) => prev.map((item) => (item.id === editor.id ? { ...item, name } : item)));
    if (current) {
      setBoxes((prev) => prev.map((box) => (box.name === current.name ? { ...box, name } : box)));
    }
    setEditor(null);
  };

  const continueNext = () => {
    if (ingredients.length === 0) {
      Alert.alert('Bahan kosong', 'Tambahkan minimal satu bahan sebelum lanjut.');
      return;
    }

    router.push({
      pathname: '/preferences',
      params: {
        data: JSON.stringify({
          bahan_terdeteksi: ingredients.map(({ id, name, confidence }) => ({ id, name, confidence })),
        }),
      },
    } as any);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={goBack} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#111111" />
        </Pressable>
        <Text style={styles.headerTitle}>Konfirmasi Bahan</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}>
        <StepIndicator currentStep={1} />

        <View style={styles.countRow}>
          <Text style={styles.countTitle}>{ingredients.length} Bahan Terdeteksi</Text>
          {reviewCount > 0 ? (
            <View style={styles.reviewBadge}>
              <Ionicons name="alert-circle" size={14} color="#C98900" />
              <Text style={styles.reviewText}>{reviewCount} Perlu Periksa</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.helper}>
          Sentuh bahan untuk menyesuaikan atau tanda silang jika bahan tidak sesuai.
        </Text>

        <View style={styles.photoCard}>
          {uriString ? (
            <View
              style={[styles.photoStage, { aspectRatio }]}
              onLayout={(event) => {
                const { width, height } = event.nativeEvent.layout;
                setFrame({ width, height });
              }}>
              {uriString ? (
                <Image
                  source={{ uri: uriString }}
                  resizeMode="cover"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: -1,
                  }}
                />
              ) : null}
              {scaleX > 0 && scaleY > 0
                ? boxes.map((item) => {
                    const low = confidencePercent(item.confidence) < LOW_MAX;
                    const left = item.bbox.x1 * scaleX;
                    const top = item.bbox.y1 * scaleY;
                    const boxWidth = Math.max(0, (item.bbox.x2 - item.bbox.x1) * scaleX);
                    const boxHeight = Math.max(0, (item.bbox.y2 - item.bbox.y1) * scaleY);
                    const labelAbove = top > 30;
                    return (
                      <View
                        key={item.id}
                        pointerEvents="none"
                        style={[
                          styles.box,
                          {
                            left,
                            top,
                            width: boxWidth,
                            height: boxHeight,
                            borderColor: low ? '#E2B93B' : GREEN,
                          },
                        ]}>
                        <View style={[styles.tag, low ? styles.tagLow : styles.tagOk, { top: labelAbove ? -26 : 4 }]}>
                          {low ? <Ionicons name="warning" size={12} color="#7A5B00" /> : null}
                          <Text style={[styles.tagText, low && styles.tagTextLow]} numberOfLines={1}>
                            {item.name} {confidencePercent(item.confidence)}%
                          </Text>
                        </View>
                      </View>
                    );
                  })
                : null}
              <Pressable style={styles.retake} onPress={goBack}>
                <Ionicons name="camera" size={14} color="#243000" />
                <Text style={styles.retakeText}>Foto ulang</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.emptyPhoto}>
              <Text style={styles.helper}>Foto tidak ditemukan.</Text>
            </View>
          )}
        </View>

        {ingredients.map((item) => {
          const low = confidencePercent(item.confidence) < LOW_MAX;
          return (
            <View key={item.id} style={[styles.card, low ? styles.cardLow : styles.cardOk]}>
              <Pressable style={styles.cardMain} onPress={() => setEditor({ id: item.id, name: item.name })}>
                <View style={[styles.dot, { backgroundColor: low ? '#E2B93B' : GREEN }]} />
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    {low ? (
                      <View style={styles.periksa}>
                        <Text style={styles.periksaText}>Periksa</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.accuracy}>
                    Akurasi{' '}
                    <Text style={{ color: low ? '#C98900' : '#3E8A16', fontWeight: '800' }}>
                      {confidencePercent(item.confidence)}%
                    </Text>
                  </Text>
                </View>
              </Pressable>
              <Pressable onPress={() => removeIngredient(item)} hitSlop={8} style={styles.removeBtn}>
                <Ionicons name="close" size={18} color="#8A8A8A" />
              </Pressable>
            </View>
          );
        })}

        <Pressable style={styles.addBtn} onPress={() => setEditor({ id: null, name: '' })}>
          <Ionicons name="add" size={16} color="#9AA08A" />
          <Text style={styles.addText}>Tambah Bahan</Text>
        </Pressable>

        <Pressable style={styles.nextBtn} onPress={continueNext}>
          <Text style={styles.nextText}>Lanjut ke Preferensi</Text>
        </Pressable>
        <Text style={styles.footnote}>Pastikan semua bahan sudah sesuai sebelum meracik</Text>
      </ScrollView>

      <Modal visible={editor !== null} transparent animationType="fade" onRequestClose={() => setEditor(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editor?.id ? 'Sesuaikan bahan' : 'Tambah bahan'}</Text>
            <TextInput
              value={editor?.name ?? ''}
              onChangeText={(name) => setEditor((prev) => (prev ? { ...prev, name } : prev))}
              placeholder="Nama bahan"
              placeholderTextColor="#A0A0A0"
              style={styles.modalInput}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalGhost} onPress={() => setEditor(null)}>
                <Text style={styles.modalGhostText}>Batal</Text>
              </Pressable>
              <Pressable style={styles.modalSave} onPress={saveEditor}>
                <Text style={styles.nextText}>Simpan</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  countRow: {
    marginTop: 14,
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  countTitle: { fontSize: 18, fontWeight: '800', color: '#161616', flexShrink: 1 },
  reviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF4CC',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  reviewText: { color: '#8A6200', fontSize: 12, fontWeight: '700' },
  helper: { marginTop: 8, marginHorizontal: 20, color: '#6E6E6E', fontSize: 13, lineHeight: 18 },
  photoCard: {
    marginTop: 14,
    marginHorizontal: 20,
    borderRadius: 22,
    overflow: 'hidden',
  },
  photoStage: { width: '100%' },
  emptyPhoto: { height: 180, alignItems: 'center', justifyContent: 'center' },
  box: { position: 'absolute', borderWidth: 2, borderRadius: 12 },
  tag: {
    position: 'absolute',
    left: -2,
    maxWidth: 150,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagOk: { backgroundColor: GREEN },
  tagLow: { backgroundColor: '#F6C445' },
  tagText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  tagTextLow: { color: '#5C4700' },
  retake: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  retakeText: { fontSize: 12, fontWeight: '700', color: '#243000' },
  card: {
    marginTop: 12,
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  cardOk: { borderColor: '#D7EEC0' },
  cardLow: { borderColor: '#F0D78A', backgroundColor: '#FFF9E8' },
  cardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemName: { fontSize: 15, fontWeight: '800', color: '#161616' },
  periksa: { backgroundColor: '#F6C445', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  periksaText: { fontSize: 11, fontWeight: '800', color: '#5C4700' },
  accuracy: { marginTop: 2, fontSize: 12, color: '#6E6E6E' },
  removeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  addBtn: {
    marginTop: 12,
    marginHorizontal: 20,
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#D5D5D5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addText: { color: '#9AA08A', fontWeight: '700' },
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
  footnote: { marginTop: 10, textAlign: 'center', color: '#8A8A8A', fontSize: 12 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#161616' },
  modalInput: {
    marginTop: 12,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4E4E4',
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#161616',
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  modalGhost: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F4F4',
  },
  modalGhostText: { fontWeight: '700', color: '#444444' },
  modalSave: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GREEN,
  },
});
