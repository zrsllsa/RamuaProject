import { SaveSuccessModal } from '@/components/SaveSuccessModal';
import { StepIndicator } from '@/components/StepIndicator';
import { api } from '@/lib/api';
import { firstParam } from '@/lib/recipe-flow';
import { ResepItem, getFallbackImage, parseResepList } from '@/lib/resep';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const GREEN = '#8FCB4C';

export default function HasilScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const resepList = useMemo(() => parseResepList(params.resepList), [params.resepList]);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [savedModalVisible, setSavedModalVisible] = useState(false);

  const targetKalori = firstParam(params.target_kalori);
  const waktu = firstParam(params.waktu_memasak);
  const orang = firstParam(params.jumlah_orang);
  const jumlahAlat = firstParam(params.jumlah_alat);

  const saveRecipe = async (item: ResepItem, imageUri: string) => {
    if (saved[item.id] || savingId) return;
    try {
      setSavingId(item.id);
      const rawPayload =
        item.mentah && Object.keys(item.mentah).length
          ? {
              ...item.mentah,
              id: (item.mentah.id as string) || item.id,
              image_url: (item.mentah.image_url as string) || imageUri,
            }
          : { ...item, image_url: item.gambar || imageUri };
      await api('/api/recipes/save', {
        method: 'POST',
        body: JSON.stringify(rawPayload),
      });
      setSaved((prev) => ({ ...prev, [item.id]: true }));
      setSavedModalVisible(true);
    } catch (error: any) {
      Alert.alert('Gagal menyimpan', error?.message || 'Coba lagi ya.');
    } finally {
      setSavingId(null);
    }
  };

  const openDetail = (item: ResepItem, imageUri: string) => {
    router.push({
      pathname: '/detail-resep',
      params: {
        resep: JSON.stringify({ ...item, gambar: imageUri }),
        source: 'recommendation',
      },
    } as any);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/home' as any))}
          hitSlop={12}
          style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#111111" />
        </Pressable>
        <Text style={styles.headerTitle}>Hasil</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}>
        <StepIndicator currentStep={4} />

        <Text style={styles.title}>Resep Untukmu</Text>
        <Text style={styles.subtitle}>
          Resep ini disusun tepat dari bahan yang ada di dapurmmu dan preferensimu hari ini.
        </Text>

        <View style={styles.chips}>
          {targetKalori ? <Chip icon="flame-outline" label={`${targetKalori} kkal`} /> : null}
          {waktu ? <Chip icon="time-outline" label={waktu === '90' ? '>60 menit' : `${waktu} menit`} /> : null}
          {orang ? <Chip icon="people-outline" label={`${orang} orang`} /> : null}
          {jumlahAlat ? <Chip icon="restaurant-outline" label={`${jumlahAlat} alat`} /> : null}
        </View>

        {resepList.length === 0 ? (
          <Text style={styles.empty}>Belum ada resep yang kembali dari rekomendasi.</Text>
        ) : (
          resepList.map((item, index) => {
            const totalIngredients = item.bahan.length;
            const missingItems = item.bahan
              .filter((b) => !b.ada)
              .map((b) => b.nama)
              .filter(Boolean);
            const matchedCount = totalIngredients - missingItems.length;
            const percentage =
              totalIngredients > 0
                ? Math.round((matchedCount / totalIngredients) * 100)
                : 100;
            const full = missingItems.length === 0;
            const stored = saved[item.id];
            const imageKey = `${item.id}:${item.gambar}`;
            const imageFailed = Boolean(failedImages[imageKey]);
            const imageUri = imageFailed || !item.gambar ? getFallbackImage(index) : item.gambar;
            return (
              <View key={item.id} style={[styles.card, full ? styles.cardFull : styles.cardPartial]}>
                <View style={styles.cardTop}>
                  <View style={styles.photoWrap}>
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.photo}
                      resizeMode="cover"
                      onError={() => {
                        if (!imageFailed && item.gambar) {
                          setFailedImages((prev) => ({ ...prev, [imageKey]: true }));
                        }
                      }}
                    />
                    <Pressable style={styles.bookmark} onPress={() => saveRecipe(item, imageUri)} hitSlop={8}>
                      <Ionicons
                        name={stored ? 'bookmark' : 'bookmark-outline'}
                        size={18}
                        color={stored ? GREEN : '#243000'}
                      />
                    </Pressable>
                  </View>

                  <View style={styles.cardBody}>
                    <View style={[styles.badge, full ? styles.badgeFull : styles.badgePartial]}>
                      <Ionicons
                        name={full ? 'checkmark-circle' : 'alert-circle'}
                        size={14}
                        color={full ? '#3E8A16' : '#C98900'}
                      />
                      <Text style={[styles.badgeText, { color: full ? '#3E8A16' : '#8A6200' }]}>
                        {full
                          ? 'Bahan lengkap'
                          : `Kurang: ${missingItems.length} (${missingItems.join(', ')})`}
                      </Text>
                    </View>
                    <Text style={styles.recipeName} numberOfLines={2}>
                      {item.nama}
                    </Text>
                    {item.alat.length > 0 ? (
                      <View style={styles.toolRow}>
                        <Ionicons name="restaurant-outline" size={13} color="#66735C" />
                        <Text style={styles.toolText} numberOfLines={1}>
                          {item.alat.join(', ')}
                        </Text>
                      </View>
                    ) : null}
                    <View style={styles.metaRow}>
                      <Ionicons name="flame-outline" size={13} color="#66735C" />
                      <Text style={styles.metaText}>{item.kalori} kkal</Text>
                      <Text style={styles.dot}>•</Text>
                      <Ionicons name="time-outline" size={13} color="#66735C" />
                      <Text style={styles.metaText}>{item.waktu} mnt</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.matchRow}>
                  <Text style={styles.matchLabel}>
                    Kecocokan bahan {matchedCount} dari {totalIngredients}
                  </Text>
                  <Text style={[styles.matchPercent, { color: full ? '#3E8A16' : '#C98900' }]}>
                    {percentage}%
                  </Text>
                </View>
                <View style={styles.track}>
                  <View
                    style={[
                      styles.fill,
                      { width: `${Math.max(0, Math.min(100, percentage))}%`, backgroundColor: full ? GREEN : '#F6C445' },
                    ]}
                  />
                </View>

                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.estimateLabel}>Estimasi kalori</Text>
                    <Text style={styles.estimateValue}>{item.labelKalori}</Text>
                  </View>
                  <Pressable style={styles.detailBtn} onPress={() => openDetail(item, imageUri)}>
                    <Text style={styles.detailText}>Lihat detail resep</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <SaveSuccessModal
        visible={savedModalVisible}
        onClose={() => setSavedModalVisible(false)}
        onViewSaved={() => {
          setSavedModalVisible(false);
          router.push('/save' as any);
        }}
      />
    </View>
  );
}

function Chip({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon as any} size={14} color="#3E8A16" />
      <Text style={styles.chipText}>{label}</Text>
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
  title: { marginTop: 16, marginHorizontal: 20, fontSize: 22, fontWeight: '800', color: '#161616' },
  subtitle: { marginTop: 6, marginHorizontal: 20, color: '#6E6E6E', fontSize: 13, lineHeight: 19 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14, marginHorizontal: 20 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F8E8',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: { fontSize: 12, fontWeight: '700', color: '#3E5C12' },
  empty: { marginTop: 24, marginHorizontal: 20, color: '#6E6E6E' },
  card: {
    marginTop: 14,
    marginHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  cardFull: { borderColor: '#D7EEC0' },
  cardPartial: { borderColor: '#F3D0D0' },
  cardTop: { flexDirection: 'row', gap: 12 },
  photoWrap: { width: 108, height: 108, borderRadius: 16, overflow: 'hidden', backgroundColor: '#F4F6EF' },
  photo: { width: '100%', height: '100%' },
  bookmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeFull: { backgroundColor: '#F3F8E8' },
  badgePartial: { backgroundColor: '#FFF4CC' },
  badgeText: { fontSize: 11, fontWeight: '800' },
  recipeName: { marginTop: 6, fontSize: 16, fontWeight: '800', color: '#161616' },
  toolRow: { marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 4 },
  toolText: { flex: 1, fontSize: 12, color: '#66735C' },
  metaRow: { marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#66735C', fontWeight: '600' },
  dot: { color: '#B0B0B0' },
  matchRow: { marginTop: 12, flexDirection: 'row', justifyContent: 'space-between' },
  matchLabel: { fontSize: 12, color: '#5C6B52', fontWeight: '600' },
  matchPercent: { fontSize: 12, fontWeight: '800' },
  track: { marginTop: 6, height: 8, borderRadius: 999, backgroundColor: '#EEF2E6', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  cardFooter: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  estimateLabel: { fontSize: 11, color: '#8A8A8A' },
  estimateValue: { marginTop: 2, fontSize: 13, fontWeight: '800', color: '#161616' },
  detailBtn: {
    backgroundColor: GREEN,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  detailText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
});
