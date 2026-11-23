import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Transisi splash -> onboarding 1: fade in halus */}
      <Stack.Screen name="onboarding1" options={{ animation: 'fade', animationDuration: 600 }} />
    </Stack>
  );
}
