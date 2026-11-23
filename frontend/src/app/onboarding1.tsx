import { OnboardingSlide } from '@/components/OnboardingSlide';
import { Image } from 'expo-image';

const ONBOARD1_ANIM = require('@/assets/ramuanimation/onboarding_1.json');

function Onboarding1Svg({ width, height }: { width?: number; height?: number }) {
  return (
    <Image
      source={require('@/assets/images/onboarding1.svg')}
      style={{ width, height }}
      contentFit="cover"
      contentPosition="top"
      transition={0}
    />
  );
}

export default function Onboarding1() {
  return (
    <OnboardingSlide
      lottieSource={ONBOARD1_ANIM}
      SvgComponent={Onboarding1Svg}
      activeIndex={0}
      titlePrefix="Foto Bahan, "
      titleHighlight="Beres!"
      description="Bingung mau masak apa hari ini? Cukup foto bahan makanan di kulkas atau mejamu, biarkan sistem mengenali semuanya secara otomatis."
      buttonLabel="Lanjut"
      nextRoute="/onboarding2"
    />
  );
}
