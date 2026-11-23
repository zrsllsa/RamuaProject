import { RamuaAnimation } from '@/components/RamuaAnimation';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const LOGO_ANIM = require('@/assets/ramuanimation/animasi_logoramua.json');
// Sound disinkronkan dengan timeline animasi logo (lihat scripts/generate-splash-sound.js)
const SPLASH_SOUND = require('@/assets/sounds/splash_logo.wav');
// Animasi onboarding 1 dimuat diam-diam selama splash supaya saat layar onboarding
// dibuka komposisinya sudah ter-cache (tidak lag di awal). Murni preload, tidak tampil.
const ONBOARD1_ANIM = require('@/assets/ramuanimation/onboarding_1.json');
const PREWARM_DELAY_MS = 700;
const LOGO_WIDTH = 240;
const LOGO_HEIGHT =
  LOGO_ANIM?.w > 0 && LOGO_ANIM?.h > 0 ? Math.round(LOGO_WIDTH * (LOGO_ANIM.h / LOGO_ANIM.w)) : 240;
// Konten visual logo (frame akhir) berpusat di ~57.4% tinggi kanvas Lottie, bukan 50%
// (ada ruang kosong di atas untuk topi jatuh). Geser ke atas agar tampak tepat di tengah layar.
const LOGO_CENTER_SHIFT = -Math.round(LOGO_HEIGHT * (310 / 540 - 0.5));
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

  useEffect(() => {
    // Sound splash: murni tambahan, gagal diam-diam tanpa mengganggu alur splash
    let player: { play: () => void; remove: () => void } | null = null;
    try {
      const { createAudioPlayer } = require('expo-audio');
      player = createAudioPlayer(SPLASH_SOUND);
      player?.play();
    } catch {
      player = null;
    }
    return () => {
      try {
        player?.remove();
      } catch {}
    };
  }, []);

  const [prewarmOnboarding, setPrewarmOnboarding] = useState(false);
  useEffect(() => {
    // Ditunda sedikit agar tidak bentrok dengan awal animasi logo & sound
    const t = setTimeout(() => setPrewarmOnboarding(true), PREWARM_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

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

      {prewarmOnboarding && (
        <View style={styles.prewarm} pointerEvents="none">
          <RamuaAnimation
            lottieSource={ONBOARD1_ANIM}
            width={1}
            height={1}
            isActive={false}
            loop={false}
          />
        </View>
      )}
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
    transform: [{ translateY: LOGO_CENTER_SHIFT }],
  },
  animContainer: {
    overflow: 'visible',
  },
  prewarm: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    left: 0,
    top: 0,
  },
});
