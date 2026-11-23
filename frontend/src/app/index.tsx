import { RamuaAnimation } from '@/components/RamuaAnimation';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const LOGO_ANIM = require('@/assets/ramuanimation/animasi_logoramua.json');
const LOGO_WIDTH = 240;
const LOGO_HEIGHT =
  LOGO_ANIM?.w > 0 && LOGO_ANIM?.h > 0 ? Math.round(LOGO_WIDTH * (LOGO_ANIM.h / LOGO_ANIM.w)) : 240;
const ANIM_DURATION_MS =
  LOGO_ANIM?.fr > 0 ? Math.round(((LOGO_ANIM.op - LOGO_ANIM.ip) / LOGO_ANIM.fr) * 1000) : 3350;

function RamuaLogoSvg({ width, height }: { width?: number; height?: number }) {
  return (
    <Image
      source={require('@/assets/images/ramua-logo.svg')}
      style={{ width, height }}
      contentFit="contain"
      transition={0}
    />
  );
}

export default function SplashScreen() {
  const router = useRouter();
  const opacity = useSharedValue(1);
  const exitTriggeredRef = useRef(false);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goNext = useCallback(() => {
    router.replace('/onboarding1');
  }, [router]);

  const startFadeOut = useCallback(
    (delayMs: number) => {
      if (exitTriggeredRef.current) return;
      exitTriggeredRef.current = true;
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      opacity.value = withDelay(
        delayMs,
        withTiming(0, { duration: 450 }, (finished) => {
          if (finished) runOnJS(goNext)();
        })
      );
    },
    [goNext, opacity]
  );

  useEffect(() => {
    // Fallback jika Lottie tidak tersedia / gagal memanggil onAnimationFinish
    fallbackTimerRef.current = setTimeout(() => {
      startFadeOut(300);
    }, ANIM_DURATION_MS + 900);

    return () => {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
      }
    };
  }, [startFadeOut]);

  const wrapperStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoBox, wrapperStyle]}>
        <RamuaAnimation
          lottieSource={LOGO_ANIM}
          SvgComponent={RamuaLogoSvg}
          width={LOGO_WIDTH}
          height={LOGO_HEIGHT}
          resizeMode="contain"
          renderMode="AUTOMATIC"
          isActive
          loop={false}
          onAnimationFinish={(isCancelled) => {
            if (!isCancelled) {
              startFadeOut(500);
            }
          }}
          style={styles.animContainer}
        />
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
  logoBox: {
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
    overflow: 'visible',
    alignItems: 'center',
    justifyContent: 'center',
  },
  animContainer: {
    overflow: 'visible',
  },
});
