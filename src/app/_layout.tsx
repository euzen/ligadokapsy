import '@/lib/i18n';
import '../../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppNavigation } from '@/components/app-navigation';
import { AuthProvider } from '@/providers/auth-provider';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <View className="flex-1 bg-canvas">
          <AppNavigation />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F8FAFC' } }} />
        </View>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
