import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import type { BordereauData } from '@bordero/core';

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: 'Helvetica', color: '#0f172a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  title: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#0f4c5c' },
  subtitle: { fontSize: 8, color: '#64748b', marginTop: 2 },
  volet: { fontSize: 8, color: '#0f4c5c', fontFamily: 'Helvetica-Bold' },
  numero: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
  section: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 4, padding: 8, marginBottom: 8 },
  sectionTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#0f4c5c', marginBottom: 4, textTransform: 'uppercase' },
  row: { flexDirection: 'row', marginBottom: 2 },
  label: { width: 130, color: '#64748b' },
  value: { flex: 1, fontFamily: 'Helvetica-Bold' },
  signatures: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  sigBox: { width: '30%', borderTopWidth: 1, borderColor: '#94a3b8', paddingTop: 4, fontSize: 8 },
  footer: { position: 'absolute', bottom: 20, left: 32, right: 32, fontSize: 7, color: '#94a3b8', textAlign: 'center' },
});

function Ligne({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value === null || value === undefined || value === '' ? '—' : String(value)}</Text>
    </View>
  );
}

const VOLETS = ['Volet propriétaire', 'Volet vidangeur (registre)', "Volet filière d'élimination"];

export function BsmvDocument({ data }: { data: BordereauData }) {
  const dateLisible = new Date(data.dateIso).toLocaleString('fr-FR');
  return (
    <Document title={data.numero}>
      {VOLETS.map((volet) => (
        <Page key={volet} size="A4" style={styles.page}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Bordereau de suivi des matières de vidange</Text>
              <Text style={styles.subtitle}>Arrêté du 7 septembre 2009 modifié</Text>
              <Text style={[styles.volet, { marginTop: 4 }]}>{volet}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.numero}>{data.numero}</Text>
              <Text style={styles.subtitle}>{dateLisible}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vidangeur agréé</Text>
            <Ligne label="Raison sociale" value={data.vidangeur.raisonSociale} />
            <Ligne label="SIRET" value={data.vidangeur.siret} />
            <Ligne label="N° d'agrément" value={data.vidangeur.numeroAgrement} />
            <Ligne label="Département" value={data.vidangeur.departement} />
            <Ligne label="Immatriculation" value={data.vidangeur.immatriculation} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Installation vidangée</Text>
            <Ligne label="Propriétaire" value={data.installation.proprietaireNom} />
            <Ligne label="Adresse propriétaire" value={data.installation.proprietaireAdresse} />
            <Ligne label="Adresse installation" value={data.installation.adresseInstallation} />
            <Ligne label="Type d'ouvrage" value={data.installation.typeOuvrage} />
            <Ligne label="Volume (litres)" value={data.installation.volumeLitres} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Matières</Text>
            <Ligne label="Nature" value={data.matiere.nature} />
            <Ligne label="Quantité pompée (m³)" value={data.matiere.quantitePompeeM3} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Destination (filière d'élimination)</Text>
            <Ligne label="Exutoire" value={data.destination.exutoireRaisonSociale} />
            <Ligne label="Adresse" value={data.destination.exutoireAdresse} />
            <Ligne label="Quantité dépotée (m³)" value={data.destination.quantiteDepoteeM3} />
          </View>

          <View style={styles.signatures}>
            <View style={styles.sigBox}>
              <Text>Le propriétaire</Text>
            </View>
            <View style={styles.sigBox}>
              <Text>Le vidangeur</Text>
            </View>
            <View style={styles.sigBox}>
              <Text>La filière d'élimination</Text>
            </View>
          </View>

          <Text style={styles.footer}>
            Bordero — document réglementaire, conservation 10 ans. {data.numero}
          </Text>
        </Page>
      ))}
    </Document>
  );
}
