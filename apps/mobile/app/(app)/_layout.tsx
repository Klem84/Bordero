import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useSession } from '@/lib/session';
import { colors } from '@/lib/theme';

export default function AppLayout() {
  const { session, loading } = useSession();
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }
  if (!session) return <Redirect href="/login" />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.sidebar },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Ma tournée' }} />
      <Stack.Screen name="intervention/[id]" options={{ title: 'Intervention' }} />
      <Stack.Screen name="sync" options={{ title: 'Synchronisation' }} />
    </Stack>
  );
}
