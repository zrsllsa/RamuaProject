import { SaveSuccessModal } from '@/components/SaveSuccessModal';
import { api } from '@/lib/api';
import { firstParam } from '@/lib/recipe-flow';
import { PLACEHOLDER_IMAGE, parseResep, scaleTakaran } from '@/lib/resep';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const GREEN = '#8FCB4C';

export default function DetailResepScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const resep = useMemo(() => parseResep(params.resep), [params.resep]);
  const rawPayload = useMemo(() => {
    const text = firstParam(params.resep);
    if (!text) return null;
    try {
      const parsed = JSON.parse(text);
      if (parsed?.mentah && typeof parsed.mentah === 'object' && Object.keys(parsed.mentah).length) {
        return {
          ...parsed.mentah,
          id: parsed.mentah.id || parsed.id,
          image_url: parsed.mentah.image_url || parsed.gambar || parsed.image_url,
        };
      }
      return parsed;
    } catch {
      return null;
    }
  }, [params.resep]);
  const isRecommendation = firstParam(params.source) === 'recommendation';
  const [activeTab, setActiveTab] = useState<'bahan' | 'langkah'>('bahan');
  const [porsi, setPorsi] = useState(resep?.porsi || 2);
  const [imgError, setImgError] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedModalVisible, setSavedModalVisible] = useState(false);
  const basePorsi = resep?.porsi || 2;

  useEffect(() => {
    setImgError(false);
  }, [resep?.gambar]);

  useFocusEffect(
    useCallback(() => {
      if (!resep?.nama) return;
      let active = true;
      const wanted = resep.nama.trim().toLowerCase();
      api<any[]>('/api/recipes/saved')
        .then((list) => {
          if (!active || !Array.isArray(list)) return;
          const exists = list.some(
            (entry) => String(entry?.nama || entry?.title || '').trim().toLowerCase() === wanted
          );
          setIsSaved(exists);
        })
        .catch(() => {});
      return () => {
        active = false;
      };
    }, [resep?.nama])
  );

  const handleSave = async () => {
    if (!resep || isSaved || saving) return;
    try {
      setSaving(true);
      const body = rawPayload && typeof rawPayload === 'object' ? rawPayload : resep;
      await api('/api/recipes/save', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setIsSaved(true);
      setSavedModalVisible(true);
    } catch (error: any) {
      Alert.alert('Gagal menyimpan', error?.message || 'Coba lagi ya.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#111111" />
        </Pressable>
        <Text style={styles.headerTitle}>Detail Resep</Text>
        {resep ? (
          <Pressable onPress={handleSave} hitSlop={12} style={styles.backBtn} disabled={saving}>
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={isSaved ? GREEN : '#111111'}
            />
          </Pressable>
        ) : (
          <View style={styles.backBtn} />
        )}
      </View>

      {!resep ? (
        <Text style={styles.missing}>Resep tidak ditemukan.</Text>
      ) : (
        <>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
            <Image
              source={{ uri: imgError || !resep.gambar ? PLACEHOLDER_IMAGE : resep.gambar }}
              style={styles.hero}
              resizeMode="cover"
              onError={() => {
                if (!imgError && resep.gambar) {
                  setImgError(true);
                }
              }}
            />
            <Text style={styles.title}>{resep.nama}</Text>

            <View style={styles.infoRow}>
              <InfoBox icon="flame" value={`${resep.kalori} kkal`} label="Estimasi" />
              <InfoBox icon="time-outline" value={`${resep.waktu} menit`} label="Waktu masak" />
              <InfoBox icon="restaurant-outline" value={resep.alat.join(', ') || '-'} label="Alat masak" />
            </View>

            <View style={styles.tabs}>
              <Pressable
                style={[styles.tab, activeTab === 'bahan' && styles.tabOn]}
                onPress={() => setActiveTab('bahan')}>
                <Text style={[styles.tabText, activeTab === 'bahan' && styles.tabTextOn]}>Bahan</Text>
              </Pressable>
              <Pressable
                style={[styles.tab, activeTab === 'langkah' && styles.tabOn]}
                onPress={() => setActiveTab('langkah')}>
                <Text style={[styles.tabText, activeTab === 'langkah' && styles.tabTextOn]}>Langkah</Text>
              </Pressable>
            </View>

            {activeTab === 'bahan' ? (
              <View>
                <View style={styles.portionHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.portionTitle}>Bahan untuk {porsi} orang</Text>
                    <Text style={styles.portionHint}>Takaran menyesuaikan jumlah orang</Text>
                  </View>
                  <Pressable
                    style={[styles.stepBtn, porsi <= 1 && { opacity: 0.4 }]}
                    disabled={porsi <= 1}
                    onPress={() => setPorsi((value) => Math.max(1, value - 1))}>
                    <Ionicons name="remove" size={18} color="#D46A6A" />
                  </Pressable>
                  <Text style={styles.portionValue}>{porsi}</Text>
                  <Pressable
                    style={[styles.stepBtn, styles.stepPlus, porsi >= 12 && { opacity: 0.4 }]}
                    disabled={porsi >= 12}
                    onPress={() => setPorsi((value) => Math.min(12, value + 1))}>
                    <Ionicons name="add" size={18} color="#FFFFFF" />
                  </Pressable>
                </View>

                {resep.bahan.length === 0 ? (
                  <Text style={styles.empty}>Daftar bahan belum tersedia.</Text>
                ) : (
                  resep.bahan.map((item) => (
                    <View key={`${item.nama}-${item.takaran}`} style={styles.ingredient}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.ingredientName}>{item.nama}</Text>
                        {item.takaran ? (
                          <Text style={styles.ingredientAmount}>{scaleTakaran(item.takaran, basePorsi, porsi)}</Text>
                        ) : null}
                      </View>
                      {isRecommendation ? (
                        <View style={[styles.stock, item.ada ? styles.stockAda : styles.stockKurang]}>
                          <Ionicons
                            name={item.ada ? 'checkmark' : 'alert'}
                            size={12}
                            color={item.ada ? '#3E8A16' : '#8A6200'}
                          />
                          <Text style={[styles.stockText, { color: item.ada ? '#3E8A16' : '#8A6200' }]}>
                            {item.ada ? 'Ada' : 'Kurang'}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ))
                )}

                <View style={styles.spiceBox}>
                  <Text style={styles.spiceTitle}>Bumbu dasar</Text>
                  <Text style={styles.spiceBody}>{resep.bumbuDasar}</Text>
                  {isRecommendation ? (
                    <Text style={styles.spiceNote}>
                      Bumbu dapur dasar tidak dihitung sebagai bahan kurang.
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : (
              <View>
                {resep.langkah.length === 0 ? (
                  <Text style={styles.empty}>Langkah memasak belum tersedia.</Text>
                ) : (
                  resep.langkah.map((step, index) => (
                    <View key={`${step.judul}-${index}`} style={styles.stepCard}>
                      <View style={styles.stepHead}>
                        <View style={styles.stepNo}>
                          <Text style={styles.stepNoText}>{index + 1}</Text>
                        </View>
                        <Text style={styles.stepTitle}>{step.judul}</Text>
                        {step.waktu ? <Text style={styles.stepTime}>{step.waktu}</Text> : null}
                      </View>
                      {step.deskripsi ? <Text style={styles.stepDesc}>{step.deskripsi}</Text> : null}
                      {step.bahan.length > 0 ? (
                        <View style={styles.stepChips}>
                          {step.bahan.map((bahan) => (
                            <View key={bahan} style={styles.stepChip}>
                              <Text style={styles.stepChipText}>{bahan}</Text>
                            </View>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  ))
                )}
              </View>
            )}
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
            {activeTab === 'bahan' ? (
              <Pressable style={styles.mainBtn} onPress={() => setActiveTab('langkah')}>
                <Ionicons name="play" size={16} color="#FFFFFF" />
                <Text style={styles.mainBtnText}>Lihat langkah memasak</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.mainBtn} onPress={() => router.replace('/home' as any)}>
                <Text style={styles.mainBtnText}>Kembali ke beranda</Text>
              </Pressable>
            )}
          </View>
        </>
      )}

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

function InfoBox({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <View style={styles.infoBox}>
      <Ionicons name={icon as any} size={16} color={GREEN} />
      <Text style={styles.infoValue} numberOfLines={2}>
        {value}
      </Text>
      <Text style={styles.infoLabel}>{label}</Text>
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
  missing: { margin: 24, color: '#6E6E6E' },
  hero: {
    marginTop: 8,
    marginHorizontal: 20,
    height: 190,
    borderRadius: 20,
    backgroundColor: '#F4F6EF',
  },
  title: {
    marginTop: 16,
    marginHorizontal: 20,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    color: '#161616',
  },
  infoRow: { flexDirection: 'row', gap: 8, marginTop: 14, marginHorizontal: 20 },
  infoBox: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEF2E6',
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  infoValue: { fontSize: 13, fontWeight: '800', color: '#161616', textAlign: 'center' },
  infoLabel: { fontSize: 11, color: '#8A8A8A', textAlign: 'center' },
  tabs: {
    marginTop: 16,
    marginHorizontal: 20,
    flexDirection: 'row',
    backgroundColor: '#FFF6D2',
    borderRadius: 999,
    padding: 4,
  },
  tab: { flex: 1, height: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: '#FFF1B8' },
  tabText: { fontWeight: '700', color: '#8A7A45' },
  tabTextOn: { color: '#243000' },
  portionHead: {
    marginTop: 16,
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  portionTitle: { fontSize: 15, fontWeight: '800', color: '#161616' },
  portionHint: { marginTop: 2, fontSize: 12, color: '#8A8A8A' },
  portionValue: { width: 24, textAlign: 'center', fontSize: 18, fontWeight: '800', color: '#6AAA2E' },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8E8E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepPlus: { backgroundColor: GREEN },
  ingredient: {
    marginTop: 10,
    marginHorizontal: 20,
    borderRadius: 16,
    backgroundColor: '#F8FBF3',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ingredientName: { fontSize: 14, fontWeight: '800', color: '#161616' },
  ingredientAmount: { marginTop: 2, fontSize: 12, color: '#6E6E6E' },
  stock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stockAda: { backgroundColor: '#E7F6D4' },
  stockKurang: { backgroundColor: '#FFF4CC' },
  stockText: { fontSize: 12, fontWeight: '800' },
  spiceBox: {
    marginTop: 14,
    marginHorizontal: 20,
    borderRadius: 16,
    backgroundColor: '#FFF8E8',
    padding: 14,
  },
  spiceTitle: { fontSize: 14, fontWeight: '800', color: '#8A3B2F' },
  spiceBody: { marginTop: 6, fontSize: 13, fontWeight: '700', color: '#243000' },
  spiceNote: { marginTop: 6, fontSize: 11, color: '#8A8A8A' },
  empty: { marginTop: 16, marginHorizontal: 20, color: '#6E6E6E' },
  stepCard: {
    marginTop: 12,
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEF2E6',
    padding: 14,
  },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepNo: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNoText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  stepTitle: { flex: 1, fontSize: 14, fontWeight: '800', color: '#161616' },
  stepTime: { fontSize: 12, color: '#8A8A8A', fontWeight: '700' },
  stepDesc: { marginTop: 8, fontSize: 13, lineHeight: 19, color: '#444444' },
  stepChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  stepChip: { backgroundColor: '#FFF6D2', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  stepChipText: { fontSize: 11, fontWeight: '700', color: '#6A5420' },
  footer: { paddingHorizontal: 20, paddingTop: 8, backgroundColor: '#FFFFFF' },
  mainBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mainBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
