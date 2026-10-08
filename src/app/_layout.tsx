import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { fontAssets } from '@/ui/fonts';
import { SkinProvider } from '@/ui/skin/SkinProvider';
import { tudorSkin } from '@/ui/skin/tudor';

// Keep the splash screen up until the fonts are ready.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts(fontAssets);

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <SkinProvider skin={tudorSkin}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: tudorSkin.colors.screenBackground },
        }}
      />
    </SkinProvider>
  );
}
