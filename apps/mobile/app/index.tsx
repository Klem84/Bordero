import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useSession } from '@/lib/session';
import { colors } from '@/lib/theme';

export default function Index() {
  const { session, loading } = useSession();
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }
  return <Redirect href={session ? '/(app)' : '/login'} />;
}
