import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import type { BilanAgregats } from '@bordero/core';

export interface BilanData {
  annee: number;
  organisation: { raisonSociale: string; siret: string | null };
  agrement: { numero: string | null; departement: string | null };
  agregats: BilanAgregats;
  generatedAtIso: string;
}

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: 'Helvetica', color: '#0f172a' },
  title: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: '#0f4c5c' },
  subtitle: { fontSize: 9, color: '#64748b', marginBottom: 12 },
  sectionTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#0f4c5c', marginTop: 14, marginBottom: 4 },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#e2e8f0', paddingVertical: 3 },
  head: { flexDirection: 'row', backgroundColor: '#f1f5f9', paddingVertical: 4, fontFamily: 'Helvetica-Bold' },
  c1: { flex: 1, paddingHorizontal: 4 },
  c2: { width: 90, textAlign: 'right', paddingHorizontal: 4 },
  alert: { marginTop: 4, fontSize: 8, padding: 4, borderRadius: 3 },
  ok: { backgroundColor: '#dcfce7', color: '#166534' },
  ko: { backgroundColor: '#fee2e2', color: '#991b1b' },
});

export function BilanDocument({ data }: { data: BilanData }) {
  const a = data.agregats;
  return (
    <Document title={`Bilan ${data.annee}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Bilan annuel d'activité {data.annee}</Text>
        <Text style={styles.subtitle}>
          {data.organisation.raisonSociale} · SIRET {data.organisation.siret ?? '—'} · Agrément{' '}
          {data.agrement.numero ?? '—'} ({data.agrement.departement ?? '—'})
        </Text>

        <Text style={styles.sectionTitle}>Installations entretenues par commune</Text>
        <View style={styles.head}>
          <Text style={styles.c1}>Commune</Text>
          <Text style={styles.c2}>Installations</Text>
          <Text style={styles.c2}>Volume (m³)</Text>
        </View>
        {a.installationsParCommune.map((c) => (
          <View style={styles.row} key={c.commune}>
            <Text style={styles.c1}>{c.commune}</Text>
            <Text style={styles.c2}>{c.nbInstallations}</Text>
            <Text style={styles.c2}>{c.volumeM3.toFixed(1)}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Quantités par filière d'élimination</Text>
        <View style={styles.head}>
          <Text style={styles.c1}>Exutoire</Text>
          <Text style={styles.c2}>Volume (m³)</Text>
        </View>
        {a.volumesParFiliere.map((f) => (
          <View style={styles.row} key={f.exutoire}>
            <Text style={styles.c1}>{f.exutoire}</Text>
            <Text style={styles.c2}>{f.volumeM3.toFixed(1)}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Synthèse</Text>
        <View style={styles.row}>
          <Text style={styles.c1}>Total pompé</Text>
          <Text style={styles.c2}>{a.totalPompeM3.toFixed(1)} m³</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.c1}>Total dépoté</Text>
          <Text style={styles.c2}>{a.totalDepoteM3.toFixed(1)} m³</Text>
        </View>

        <View style={[styles.alert, a.controles.complet ? styles.ok : styles.ko]}>
          <Text>
            {a.controles.complet
              ? 'Bilan complet : tous les bordereaux sont bouclés et cohérents.'
              : `À régulariser : ${a.controles.bordereauxNonBoucles} bordereau(x) non bouclé(s), écart pompé/dépoté ${a.controles.ecartPompeDepotePct} %${a.controles.depassementQuota ? ', dépassement de quota' : ''}.`}
          </Text>
        </View>

        <Text style={{ marginTop: 16, fontSize: 7, color: '#94a3b8' }}>
          Document généré par Bordero le {new Date(data.generatedAtIso).toLocaleString('fr-FR')}.
        </Text>
      </Page>
    </Document>
  );
}
