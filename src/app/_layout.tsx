import '@/lib/i18n';
import '../../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppNavigation } from '@/components/app-navigation';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { CookieConsent } from '@/components/cookie-consent';
import { ToastProvider } from '@/components/ui/toast-provider';
import { AuthProvider } from '@/providers/auth-provider';
import { ThemeProvider } from '@/providers/theme-provider';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <ToastProvider>
            <StatusBar style="auto" />
            <View className="flex-1 bg-slate-50 dark:bg-slate-900">
              <AppNavigation />
              <Breadcrumbs />
              <View className="flex-1">
                <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />
              </View>
              <CookieConsent />
            </View>
          </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
