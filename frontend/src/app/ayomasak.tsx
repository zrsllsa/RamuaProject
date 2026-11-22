import { firstParam } from '@/lib/recipe-flow';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function recipeTitle(item: any, index: number) {
  return item?.title || item?.name || item?.nama || item?.judul || `Resep ${index + 1}`;
}

export default function AyoMasakScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ data?: string }>();
  const recipes = useMemo(() => {
    const text = firstParam(params.data);
    if (!text) return [];
    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [params.data]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => router.replace('/home' as any)}
          hitSlop={12}
          style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#111111" />
        </Pressable>
        <Text style={styles.headerTitle}>Hasil Resep</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}>
        <Text style={styles.title}>Resep untukmu</Text>
        <Text style={styles.subtitle}>{recipes.length} resep berhasil diracik dari bahan dan preferensimu.</Text>

        {recipes.length === 0 ? (
          <Text style={styles.empty}>Belum ada resep yang kembali dari rekomendasi.</Text>
        ) : (
          recipes.map((item, index) => (
            <View key={`${recipeTitle(item, index)}-${index}`} style={styles.card}>
              <Text style={styles.cardTitle}>{recipeTitle(item, index)}</Text>
              {item?.summary || item?.deskripsi || item?.description ? (
                <Text style={styles.cardBody} numberOfLines={3}>
                  {item.summary || item.deskripsi || item.description}
                </Text>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
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
  empty: { marginTop: 24, marginHorizontal: 20, color: '#6E6E6E' },
  card: {
    marginTop: 14,
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#D7EEC0',
    padding: 14,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#161616' },
  cardBody: { marginTop: 6, color: '#555555', fontSize: 13, lineHeight: 18 },
});
