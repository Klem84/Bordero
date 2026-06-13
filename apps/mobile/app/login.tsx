import { useState } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { BigButton } from '@/components/BigButton';
import { useSession } from '@/lib/session';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { colors, radius, spacing, TOUCH, text } from '@/lib/theme';

export default function Login() {
  const { session } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (session) return <Redirect href="/(app)" />;

  async function signIn() {
    setError(null);
    if (!supabaseConfigured) {
      setError('Configuration Supabase manquante (EXPO_PUBLIC_SUPABASE_*).');
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (err) {
      setError('Identifiants invalides.');
      return;
    }
    router.replace('/(app)');
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <Text style={styles.brand}>Bordero</Text>
      <Text style={[text.subtitle, { marginBottom: spacing.xl }]}>Espace chauffeur</Text>

      <Text style={text.label}>Email</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
        placeholder="vous@entreprise.fr"
        placeholderTextColor={colors.inkMuted}
      />

      <Text style={[text.label, { marginTop: spacing.md }]}>Mot de passe</Text>
      <TextInput
        style={styles.input}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        placeholderTextColor={colors.inkMuted}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={{ marginTop: spacing.xl }}>
        <BigButton label="Se connecter" onPress={signIn} loading={loading} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  brand: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.brand,
  },
  input: {
    minHeight: TOUCH,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    fontSize: 18,
    color: colors.ink,
    marginTop: spacing.xs,
  },
  error: {
    marginTop: spacing.md,
    color: colors.danger,
    fontSize: 15,
  },
});
