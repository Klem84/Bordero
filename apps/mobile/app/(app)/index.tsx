import { useCallback, useState } from 'react';
import { Link, useFocusEffect } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { BigButton } from '@/components/BigButton';
import { STATUT } from '@/lib/statuts';
import { getInterventionsDuJour, compterEnAttente, type LocalIntervention } from '@/lib/db';
import { synchroniser } from '@/lib/sync';
import { supabase } from '@/lib/supabase';
import { colors, radius, spacing, text } from '@/lib/theme';

const aujourdHui = () => new Date().toISOString().slice(0, 10);

export default function Tournee() {
  const [items, setItems] = useState<LocalIntervention[]>([]);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const charger = useCallback(async () => {
    const [list, p] = await Promise.all([getInterventionsDuJour(aujourdHui()), compterEnAttente()]);
    setItems(list);
    setPending(p);
  }, []);

  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger]),
  );

  async function onSync() {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await synchroniser(aujourdHui());
      setMessage(
        `${res.tires} interventions à jour, ${res.envoyes} envoyées${res.echecs ? `, ${res.echecs} en attente` : ''}.`,
      );
    } catch {
      setMessage('Synchronisation impossible (hors ligne ?). Les actions restent enregistrées.');
    } finally {
      setSyncing(false);
      charger();
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <Link href="/(app)/sync" asChild>
          <Pressable accessibilityRole="button">
            <Text style={[text.label, pending > 0 && { color: colors.brand }]}>
              {pending > 0 ? `${pending} action(s) à synchroniser ›` : 'Tout est synchronisé'}
            </Text>
          </Pressable>
        </Link>
        <Pressable onPress={() => supabase.auth.signOut()}>
          <Text style={styles.logout}>Déconnexion</Text>
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: spacing.lg }}>
        <BigButton label={syncing ? 'Synchronisation…' : 'Synchroniser'} onPress={onSync} loading={syncing} />
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>

      <FlatList
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        data={items}
        keyExtractor={(i) => i.id}
        refreshControl={<RefreshControl refreshing={false} onRefresh={charger} tintColor={colors.brand} />}
        ListEmptyComponent={
          <Text style={[text.subtitle, { textAlign: 'center', marginTop: spacing.xl }]}>
            Aucune intervention pour aujourd&apos;hui. Touchez « Synchroniser ».
          </Text>
        }
        renderItem={({ item }) => {
          const s = STATUT[item.status] ?? { label: item.status, color: colors.inkMuted };
          return (
            <Link href={`/(app)/intervention/${item.id}`} asChild>
              <Pressable style={styles.card}>
                <View style={styles.cardHead}>
                  <Text style={styles.client}>{item.client_nom ?? 'Client'}</Text>
                  {item.urgence ? <Text style={styles.urgence}>URGENCE</Text> : null}
                </View>
                {item.site_adresse ? <Text style={styles.adresse}>{item.site_adresse}</Text> : null}
                <View style={[styles.badge, { backgroundColor: s.color }]}>
                  <Text style={styles.badgeText}>{s.label}</Text>
                </View>
              </Pressable>
            </Link>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  logout: { color: colors.brand, fontWeight: '600', fontSize: 15 },
  message: { marginTop: spacing.sm, color: colors.inkMuted, fontSize: 14 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  client: { fontSize: 18, fontWeight: '700', color: colors.ink },
  urgence: { color: colors.danger, fontWeight: '800', fontSize: 13 },
  adresse: { color: colors.inkMuted, fontSize: 15 },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: spacing.xs,
  },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
