import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { BigButton } from '@/components/BigButton';
import { getEvenementsEnAttente, type OutboxEvent } from '@/lib/db';
import { synchroniser } from '@/lib/sync';
import { colors, radius, spacing, text } from '@/lib/theme';

const TYPE_LABEL: Record<string, string> = {
  transition: 'Changement d’état',
  releve: 'Relevé d’intervention',
  signature: 'Signature client',
};

function resume(ev: OutboxEvent): string {
  if (ev.type === 'transition') return `${ev.status_from ?? '?'} → ${ev.status_to ?? '?'}`;
  try {
    const p = JSON.parse(ev.payload || '{}');
    if (ev.type === 'releve') {
      const v = p.volume_m3 != null ? `${p.volume_m3} m³` : 'sans volume';
      return v + (p.prochaine_date ? ` · prochaine ${p.prochaine_date}` : '');
    }
    if (ev.type === 'signature') return p.client_absent ? 'Client absent' : (p.signataire_nom ?? 'Signé');
  } catch {
    // payload illisible
  }
  return '';
}

export default function SyncScreen() {
  const [events, setEvents] = useState<OutboxEvent[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setEvents(await getEvenementsEnAttente());
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
      const res = await synchroniser(new Date().toISOString().slice(0, 10));
      setMessage(
        res.echecs > 0
          ? `${res.envoyes} envoyé(s), ${res.echecs} en attente (hors ligne ?).`
          : `${res.envoyes} action(s) synchronisée(s).`,
      );
    } catch {
      setMessage('Synchronisation impossible. Réessayez quand le réseau revient.');
    } finally {
      setSyncing(false);
      charger();
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={text.title}>À synchroniser</Text>
        <Text style={[text.subtitle, { marginTop: 2 }]}>
          {events.length > 0
            ? `${events.length} action(s) terrain en attente d’envoi.`
            : 'Tout est synchronisé.'}
        </Text>
      </View>

      <View style={{ paddingHorizontal: spacing.lg }}>
        <BigButton
          label={syncing ? 'Synchronisation…' : 'Synchroniser maintenant'}
          onPress={onSync}
          loading={syncing}
          disabled={events.length === 0 && !syncing}
        />
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>

      <FlatList
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
        data={events}
        keyExtractor={(e) => e.client_event_uuid}
        ListEmptyComponent={
          <Text style={[text.subtitle, { textAlign: 'center', marginTop: spacing.xl }]}>
            Aucune action en attente. Vos saisies terrain sont à jour sur le serveur.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.dot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.type}>{TYPE_LABEL[item.type] ?? item.type}</Text>
              <Text style={styles.resume}>{resume(item)}</Text>
            </View>
            <Text style={styles.time}>
              {new Date(item.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  message: { marginTop: spacing.sm, color: colors.inkMuted, fontSize: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  dot: { width: 10, height: 10, borderRadius: 999, backgroundColor: colors.warning },
  type: { fontSize: 16, fontWeight: '700', color: colors.ink },
  resume: { fontSize: 14, color: colors.inkMuted, marginTop: 2 },
  time: { fontSize: 13, color: colors.inkMuted, fontVariant: ['tabular-nums'] },
});
