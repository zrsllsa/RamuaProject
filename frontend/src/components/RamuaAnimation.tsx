import { Image, type ImageSource } from 'expo-image';
import type { AnimationObject, LottieViewProps } from 'lottie-react-native';
import { type ComponentType, type Ref, useEffect, useRef, useState } from 'react';
import {
  type DimensionValue,
  Platform,
  type StyleProp,
  StyleSheet,
  UIManager,
  View,
  type ViewStyle,
} from 'react-native';

export type SvgFallbackComponent = ComponentType<{ width?: number; height?: number }>;

type LottieViewHandle = {
  play: (startFrame?: number, endFrame?: number) => void;
  pause: () => void;
  reset: () => void;
  resume: () => void;
};

type RamuaAnimationProps = {
  lottieSource: AnimationObject;
  SvgComponent?: SvgFallbackComponent;
  pngSource?: ImageSource | number | string;
  width?: DimensionValue;
  height?: DimensionValue;
  maxWidth?: DimensionValue;
  maxHeight?: DimensionValue;
  resizeMode?: 'contain' | 'cover' | 'center';
  renderMode?: 'AUTOMATIC' | 'HARDWARE' | 'SOFTWARE';
  isActive?: boolean;
  loop?: boolean;
  onAnimationFinish?: (isCancelled: boolean) => void;
  style?: StyleProp<ViewStyle>;
};

const isNativeLottieAvailable =
  Platform.OS === 'web' ||
  Boolean(
    UIManager.getViewManagerConfig?.('LottieAnimationView') ||
      UIManager.getViewManagerConfig?.('RCTLottieAnimationView')
  );

let cachedLottieView:
  | ComponentType<LottieViewProps & { ref?: Ref<LottieViewHandle> }>
  | null
  | undefined;

function getLottieView() {
  if (cachedLottieView !== undefined) return cachedLottieView;
  if (!isNativeLottieAvailable) {
    cachedLottieView = null;
    return null;
  }
  try {
    const mod = require('lottie-react-native');
    cachedLottieView = (mod?.default ?? mod?.LottieView ?? null) as
      | ComponentType<LottieViewProps & { ref?: Ref<LottieViewHandle> }>
      | null;
  } catch {
    cachedLottieView = null;
  }
  return cachedLottieView;
}

/**
 * Renders a Lottie JSON animation when the native ViewManager is available,
 * showing the SVG or static PNG fallback only until the first frame loads
 * (no overlap/ghosting) or when native Lottie is unavailable/fails.
 */
export function RamuaAnimation({
  lottieSource,
  SvgComponent,
  pngSource,
  width = '100%',
  height,
  maxWidth,
  maxHeight,
  resizeMode = 'contain',
  renderMode = 'AUTOMATIC',
  isActive = true,
  loop = true,
  onAnimationFinish,
  style,
}: RamuaAnimationProps) {
  const LottieView = getLottieView();
  const lottieRef = useRef<LottieViewHandle>(null);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  const initialW = typeof width === 'number' ? width : typeof maxWidth === 'number' ? maxWidth : 0;
  const initialH =
    typeof height === 'number' ? height : typeof maxHeight === 'number' ? maxHeight : 0;
  const [boxSize, setBoxSize] = useState({ width: initialW, height: initialH });

  const aspectRatio =
    lottieSource.w > 0 && lottieSource.h > 0 ? lottieSource.w / lottieSource.h : 1;

  useEffect(() => {
    const ref = lottieRef.current;
    if (!ref) return;
    if (isActive) {
      ref.play();
    } else {
      ref.pause();
    }
  }, [isActive, isReady]);

  const effectiveW = boxSize.width > 0 ? boxSize.width : initialW;
  const effectiveH = boxSize.height > 0 ? boxSize.height : initialH;

  let fittedW = effectiveW;
  let fittedH = effectiveH;
  if (effectiveW > 0 && effectiveH > 0) {
    fittedW =
      resizeMode === 'cover'
        ? Math.max(effectiveW, effectiveH * aspectRatio)
        : Math.min(effectiveW, effectiveH * aspectRatio);
    fittedH = fittedW / aspectRatio;
  } else if (effectiveW > 0) {
    fittedH = effectiveW / aspectRatio;
  } else if (effectiveH > 0) {
    fittedW = effectiveH * aspectRatio;
  }

  const showLottie = Boolean(LottieView) && !hasError;
  const showFallback = !showLottie || !isReady;
  const isCover = resizeMode === 'cover';
  const fallbackW = isCover ? effectiveW : fittedW;
  const fallbackH = isCover ? effectiveH : fittedH;

  return (
    <View
      onLayout={(e) => {
        const { width: lw, height: lh } = e.nativeEvent.layout;
        if (lw > 0 && lh > 0 && (lw !== boxSize.width || lh !== boxSize.height)) {
          setBoxSize({ width: lw, height: lh });
        }
      }}
      style={[
        styles.container,
        isCover ? styles.coverAlign : styles.centerAlign,
        { width, height, maxWidth, maxHeight },
        style,
      ]}>
      {fittedW > 0 && fittedH > 0 && (
        <View style={{ width: fittedW, height: fittedH, aspectRatio }}>
          {showFallback &&
            (SvgComponent ? (
              <SvgComponent width={fallbackW} height={fallbackH} />
            ) : pngSource != null ? (
              <Image
                source={pngSource}
                style={{ width: fallbackW, height: fallbackH }}
                contentFit={isCover ? 'cover' : 'contain'}
                transition={0}
              />
            ) : null)}
          {showLottie && LottieView && (
            <LottieView
              ref={lottieRef}
              source={lottieSource}
              renderMode={renderMode}
              resizeMode="contain"
              loop={loop}
              autoPlay={isActive}
              style={StyleSheet.absoluteFill}
              webStyle={{ width: '100%', height: '100%' }}
              onAnimationLoaded={() => setIsReady(true)}
              onAnimationFailure={() => setHasError(true)}
              onAnimationFinish={onAnimationFinish}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  centerAlign: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverAlign: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
});
