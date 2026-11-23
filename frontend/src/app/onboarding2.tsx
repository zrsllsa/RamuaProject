import { OnboardingSlide } from '@/components/OnboardingSlide';
import { Image } from 'expo-image';

const ONBOARD2_ANIM = require('@/assets/ramuanimation/onboarding_2.json');

function Onboarding2Svg({ width, height }: { width?: number; height?: number }) {
  return (
    <Image
      source={require('@/assets/images/onboarding2.svg')}
      style={{ width, height }}
      contentFit="cover"
      contentPosition="top"
      transition={0}
    />
  );
}

export default function Onboarding2() {
  return (
    <OnboardingSlide
      lottieSource={ONBOARD2_ANIM}
      SvgComponent={Onboarding2Svg}
      activeIndex={1}
      titlePrefix="Pilih Alat & "
      titleHighlight="Target Kalori"
      description="Tentukan alat yang kamu miliki di dapur interaktif serta atur estimasi waktu dan jumlah porsi."
      buttonLabel="Lanjut"
      nextRoute="/onboarding3"
    />
  );
}
