import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

// Warna ombre per huruf, dari #94BE56 ke #7080B4
function OmbreText({ text, style }: { text: string; style: any }) {
  const from = [0x94, 0xbe, 0x56];
  const to = [0x70, 0x80, 0xb4];
  const last = Math.max(text.length - 1, 1);

  return (
    <Text style={style}>
      {text.split('').map((ch, i) => {
        const t = i / last;
        const c = from.map((f, k) => Math.round(f + (to[k] - f) * t));
        return (
          <Text key={i} style={{ color: `rgb(${c[0]}, ${c[1]}, ${c[2]})` }}>
            {ch}
          </Text>
        );
      })}
    </Text>
  );
}

export default function Onboarding1() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const s = width / 375; // skala dari ukuran desain Figma (375 lebar)

  const waveTop = 490 * s; // posisi atas gelombang
  const waveHeight = (211 / 374) * width; // rasio gelombang 374 x 211
  const whiteTop = waveTop + 96 * s; // shape putih mulai di bagian solid gelombang

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* LAYER 1 (paling belakang): gambar ilustrasi */}
      <Animated.View entering={FadeIn.duration(700)} style={styles.layer}>
        <Image
          source={require('@/assets/images/onboarding1.svg')}
          style={{ width, height: 662 * s }}
          contentFit="cover"
          contentPosition="top"
        />
      </Animated.View>

      {/* LAYER 2: gelombang blur (di atas gambar) */}
      <Image
        source={require('@/assets/images/gelombang.svg')}
        style={{ position: 'absolute', left: 0, top: waveTop, width, height: waveHeight }}
        contentFit="fill"
        pointerEvents="none"
      />

      {/* LAYER 3: shape putih untuk tulisan (menyambung dengan bagian solid gelombang) */}
      <View style={[styles.whiteShape, { top: whiteTop }]} />

      {/* LAYER 4 (paling depan): teks + tombol */}
      <Animated.View
        entering={FadeInDown.delay(300).duration(600)}
        style={[styles.content, { top: 574 * s }]}>
        <View>
          <View style={styles.dots}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>

          <Text style={styles.title}>
            Foto Bahan, <OmbreText text="Beres!" style={styles.title} />
          </Text>

          <Text style={styles.desc}>
            Bingung mau masak apa hari ini? Cukup foto bahan makanan di kulkas atau mejamu,
            biarkan sistem mengenali semuanya secara otomatis.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.button}
          activeOpacity={0.85}
          onPress={() => router.push('/onboarding2')}>
          <Text style={styles.buttonText}>Lanjut</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  layer: { position: 'absolute', top: 0, left: 0, right: 0 },
  whiteShape: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#FFFFFF' },
  content: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 27,
    paddingBottom: 27,
    justifyContent: 'space-between',
  },
  dots: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D9D9D9' },
  dotActive: { backgroundColor: '#A5D65B' },
  title: { fontSize: 24, fontWeight: '700', color: '#111111' },
  desc: {
    marginTop: 12,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#666666',
    textAlign: 'justify',
  },
  button: {
    backgroundColor: '#8DB84A',
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});