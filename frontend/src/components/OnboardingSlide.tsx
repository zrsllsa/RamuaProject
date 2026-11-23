import { RamuaAnimation, type SvgFallbackComponent } from '@/components/RamuaAnimation';
import { useIsFocused, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { AnimationObject } from 'lottie-react-native';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

type OnboardingSlideProps = {
  lottieSource: AnimationObject;
  SvgComponent: SvgFallbackComponent;
  activeIndex: 0 | 1 | 2;
  titlePrefix: string;
  titleHighlight: string;
  description: string;
  buttonLabel: string;
  nextRoute: '/onboarding2' | '/onboarding3' | '/login';
  /** Geser posisi animasi (px desain lebar 375, negatif = naik). Default 0. */
  animOffsetY?: number;
};

const WAVE_PATH =
  'M138.5 26C85.2828 16.3355 0 26 0 26V191.5L380 210.5V0C380 0 311.477 65.0222 256.5 68C207.658 70.6455 186.627 34.7401 138.5 26Z';

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

export function OnboardingSlide({
  lottieSource,
  SvgComponent,
  activeIndex,
  titlePrefix,
  titleHighlight,
  description,
  buttonLabel,
  nextRoute,
  animOffsetY = 0,
}: OnboardingSlideProps) {
  const router = useRouter();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const s = screenWidth / 375;
  const animHeight = Math.round(screenWidth * (lottieSource.h / lottieSource.w));
  const waveHeight = Math.round((211 / 374) * screenWidth);
  const waveHeaderHeight = Math.round(96 * s);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* LAYER 1: animasi penuh selebar layar menempel dari tepi atas */}
      <Animated.View
        entering={FadeIn.duration(700)}
        style={[
          styles.layer,
          { width: screenWidth, height: animHeight, top: Math.round(animOffsetY * s) },
        ]}>
        <RamuaAnimation
          lottieSource={lottieSource}
          SvgComponent={SvgComponent}
          width={screenWidth}
          height={animHeight}
          resizeMode="cover"
          renderMode="AUTOMATIC"
          isActive={isFocused}
        />
      </Animated.View>

      {/* LAYER 2: gelombang putih melengkung + area teks putih solid di bagian bawah */}
      <Animated.View entering={FadeInDown.delay(300).duration(600)} style={styles.bottomWrap}>
        <View
          style={{ width: screenWidth, height: waveHeaderHeight, overflow: 'visible' }}
          pointerEvents="none">
          <Svg
            width={screenWidth}
            height={waveHeight}
            viewBox="0 0 374 211"
            preserveAspectRatio="none">
            <Defs>
              <LinearGradient
                id="waveGrad"
                x1="190"
                y1="0"
                x2="190"
                y2="210.5"
                gradientUnits="userSpaceOnUse">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
                <Stop offset="0.43098" stopColor="#FFFFFF" stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Path d={WAVE_PATH} fill="url(#waveGrad)" />
          </Svg>
        </View>

        <View style={[styles.content, { paddingBottom: Math.max(27, insets.bottom + 16) }]}>
          <View>
            <View style={styles.dots}>
              {[0, 1, 2].map((dotIdx) => (
                <View
                  key={dotIdx}
                  style={[styles.dot, dotIdx === activeIndex && styles.dotActive]}
                />
              ))}
            </View>

            <Text style={styles.title}>
              {titlePrefix}
              <OmbreText text={titleHighlight} style={styles.title} />
            </Text>

            <Text style={styles.desc}>{description}</Text>
          </View>

          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.85}
            onPress={() => router.push(nextRoute)}>
            <Text style={styles.buttonText}>{buttonLabel}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  layer: { position: 'absolute', top: 0, left: 0 },
  bottomWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  content: {
    zIndex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 27,
    paddingTop: 4,
    gap: 24,
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
