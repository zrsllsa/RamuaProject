import { OnboardingSlide } from '@/components/OnboardingSlide';
import { Image } from 'expo-image';

const ONBOARD3_ANIM = require('@/assets/ramuanimation/onboarding_3.json');

function Onboarding3Svg({ width, height }: { width?: number; height?: number }) {
  return (
    <Image
      source={require('@/assets/images/onboarding3.svg')}
      style={{ width, height }}
      contentFit="cover"
      contentPosition="top"
      transition={0}
    />
  );
}

export default function Onboarding3() {
  return (
    <OnboardingSlide
      lottieSource={ONBOARD3_ANIM}
      SvgComponent={Onboarding3Svg}
      activeIndex={2}
      titlePrefix="Resep Pas, "
      titleHighlight="Tanpa Ribet"
      description="Dapatkan rekomendasi resep terbaik yang cocok dengan bahan dan preferensimu. Tinggal ikuti langkahnya, siap santap!"
      buttonLabel="Mulai Masak!"
      nextRoute="/login"
    />
  );
}
