
import React, { useState } from 'react';
import {
  Alert,
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
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomBar, BAR_H } from '@/components/bottom-bar';

// ---- route ----
const ROUTE_SEARCH = '/search';
const ROUTE_AYO_MASAK = '/ayomasak';

// ---- tipe data (nanti sama dengan response API resep tersimpan) ----
type SavedRecipe = {
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

// Data contoh kalau belum ada resep tersimpan / API belum siap
const SAMPLE_SAVED: SavedRecipe[] = [
  {
    id: 'steak',
    title: 'Steak',
    image: require('@/assets/images/home/home7.jpg'),
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

export default function SaveScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const s = width / 390; // skala layar, samakan dengan home & search

  const [saved, setSaved] = useState<SavedRecipe[]>(SAMPLE_SAVED);

  // ---- ukuran kartu: kartu utama + rangkuman yang menyelip di baliknya ----
  const boxW = width - 40 * s; // lebar total
  const overlap = 26; // rangkuman menyelip di balik kartu utama
  const mainW = boxW * 0.7;
  const mainH = mainW * 0.5;
  const sumW = boxW - mainW + overlap;
  const imgSize = mainH * 0.82; // gambar persegi 1:1

  const confirmDelete = (item: SavedRecipe) => {
    Alert.alert('Hapus resep', `Hapus "${item.title}" dari daftar simpanan?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        // TODO: nanti panggil API hapus resep tersimpan (DELETE /saved-recipes/{id})
        onPress: () => setSaved((prev) => prev.filter((r) => r.id !== item.id)),
      },
    ]);
  };

  const goAyoMasak = (id: string) =>
    router.push({ pathname: ROUTE_AYO_MASAK, params: { id } } as any);

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
          paddingTop: 24 * s,
          paddingBottom: BAR_H + insets.bottom + 40 * s,
        }}>
        {/* Daftar resep tersimpan */}
        {saved.map((r) => (
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

              <Pressable style={styles.cookBtn} onPress={() => goAyoMasak(r.id)}>
                <Text style={styles.cookBtnText}>Ayo Masak!</Text>
              </Pressable>
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

              {/* Tombol hapus */}
              <Pressable style={styles.trashBtn} onPress={() => confirmDelete(r)} hitSlop={8}>
                <Ionicons name="trash" size={16} color="#111111" />
              </Pressable>
            </View>
          </View>
        ))}

        {/* Tombol tambah resep -> Search */}
        <Pressable
          style={[styles.addBtn, { marginHorizontal: 20 * s, height: 48 * s }]}
          onPress={() => router.push(ROUTE_SEARCH as any)}>
          <Ionicons name="add" size={16} color="#B5B5B5" />
          <Text style={styles.addText}>Tambah Resep</Text>
        </Pressable>
      </ScrollView>

      <BottomBar current="save" />
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
  macro: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  macroBar: { width: 2, height: 22, borderRadius: 1, backgroundColor: '#8DB63C' },
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
});
