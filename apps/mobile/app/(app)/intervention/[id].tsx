import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  INTERVENTION_TRANSITIONS,
  isFinalState,
  type InterventionState,
} from '@bordero/core';
import { BigButton } from '@/components/BigButton';
import { STATUT, ACTION_VERS } from '@/lib/statuts';
import { getIntervention, appliquerStatutLocal, type LocalIntervention } from '@/lib/db';
import { synchroniser } from '@/lib/sync';
import { colors, radius, spacing, text } from '@/lib/theme';

// Transitions pertinentes pour le chauffeur sur le terrain.
const CHAUFFEUR_CIBLES: InterventionState[] = [
  'EN_ROUTE',
  'SUR_SITE',
  'TERMINEE',
  'IMPOSSIBLE',
  'ANNULEE',
];

export default function InterventionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<LocalIntervention | null>(null);
  const [busy, setBusy] = useState(false);

  const charger = useCallback(async () => {
    if (!id) return;
    setItem(await getIntervention(id));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      charger();
    }, [charger]),
  );

  async function transiter(to: InterventionState) {
    if (!item) return;
    setBusy(true);
    try {
      await appliquerStatutLocal({ interventionId: item.id, from: item.status, to });
      await charger();
      // Tentative de synchronisation immédiate (sans bloquer si hors ligne).
      synchroniser(new Date().toISOString().slice(0, 10)).catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }

  if (!item) {
    return (
      <View style={styles.container}>
        <Text style={text.subtitle}>Intervention introuvable hors ligne.</Text>
      </View>
    );
  }

  const s = STATUT[item.status];
  const cibles = (INTERVENTION_TRANSITIONS[item.status] ?? []).filter((t) =>
    CHAUFFEUR_CIBLES.includes(t),
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.client}>{item.client_nom ?? 'Client'}</Text>
        {item.site_adresse ? <Text style={styles.adresse}>{item.site_adresse}</Text> : null}
        <View style={[styles.badge, { backgroundColor: s.color }]}>
          <Text style={styles.badgeText}>{s.label}</Text>
        </View>
        {item.urgence ? <Text style={styles.urgence}>Intervention urgente</Text> : null}
      </View>

      <Text style={[text.label, { marginTop: spacing.xl, marginBottom: spacing.sm }]}>
        {isFinalState(item.status) ? 'Intervention close' : 'Prochaine étape'}
      </Text>

      <View style={{ gap: spacing.md }}>
        {cibles.length === 0 ? (
          <Text style={text.subtitle}>Aucune action disponible à cet état.</Text>
        ) : (
          cibles.map((to) => (
            <BigButton
              key={to}
              label={ACTION_VERS[to] ?? to}
              variant={to === 'IMPOSSIBLE' || to === 'ANNULEE' ? 'danger' : 'primary'}
              disabled={busy}
              onPress={() => transiter(to)}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, backgroundColor: colors.bg, flexGrow: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  client: { fontSize: 22, fontWeight: '800', color: colors.ink },
  adresse: { fontSize: 16, color: colors.inkMuted },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  urgence: { color: colors.danger, fontWeight: '700' },
});
