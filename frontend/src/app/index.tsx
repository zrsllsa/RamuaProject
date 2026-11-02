import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const SIZE = 230; // ukuran logo

export default function SplashScreen() {
  const router = useRouter();

  const cover = useSharedValue(-SIZE); // awal: lapisan putih menutupi logo penuh
  const opacity = useSharedValue(1);

  const goNext = () => router.replace('/onboarding1');

  useEffect(() => {
    // 1. Lapisan putih bergeser ke kanan bawah -> logo terungkap dari kiri atas
    cover.value = withTiming(SIZE, {
      duration: 2000,
      easing: Easing.inOut(Easing.quad),
    });

    // 2. Tahan sebentar, lalu memudar dan pindah halaman
    opacity.value = withDelay(
      2600,
      withTiming(0, { duration: 500 }, (finished) => {
        if (finished) runOnJS(goNext)();
      })
    );
  }, []);

  const coverStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: cover.value }, { translateY: cover.value }],
  }));

  const wrapperStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoBox, wrapperStyle]}>
        <Image
          source={require('@/assets/images/ramua-logo.svg')}
          style={styles.logo}
          contentFit="contain"
        />

        {/* Lapisan putih transparan yang menyingkap logo secara diagonal */}
        <Animated.View style={[styles.cover, coverStyle]} pointerEvents="none">
          <LinearGradient
            colors={['rgba(255,255,255,0)', '#FFFFFF']}
            locations={[0, 0.5]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBox: { width: SIZE, height: SIZE, overflow: 'hidden' },
  logo: { width: SIZE, height: SIZE },
  cover: { position: 'absolute', top: 0, left: 0, width: SIZE * 2, height: SIZE * 2 },
});
