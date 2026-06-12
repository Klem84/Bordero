import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';

export interface FactureLigneData {
  designation: string;
  quantite: number;
  puHtCents: number;
  tvaTaux: number;
}

export interface FactureData {
  numero: string;
  dateIso: string;
  echeanceIso: string | null;
  organisation: { raisonSociale: string; siret: string | null; adresse: string | null };
  client: { nom: string; adresse: string | null };
  lignes: FactureLigneData[];
  totalHtCents: number;
  totalTvaCents: number;
  totalTtcCents: number;
}

const euros = (cents: number) =>
  (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: 'Helvetica', color: '#0f172a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  brand: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#0f4c5c' },
  small: { fontSize: 8, color: '#64748b' },
  title: { fontSize: 13, fontFamily: 'Helvetica-Bold' },
  block: { marginBottom: 16 },
  tableHead: { flexDirection: 'row', backgroundColor: '#f1f5f9', padding: 6, fontFamily: 'Helvetica-Bold' },
  tableRow: { flexDirection: 'row', padding: 6, borderBottomWidth: 1, borderColor: '#e2e8f0' },
  cDesig: { flex: 1 },
  cNum: { width: 70, textAlign: 'right' },
  totals: { marginTop: 12, marginLeft: 'auto', width: 200 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  totalTtc: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: '#0f4c5c', borderTopWidth: 1, borderColor: '#cbd5e1', paddingTop: 4, marginTop: 4 },
});

export function FactureDocument({ data }: { data: FactureData }) {
  return (
    <Document title={data.numero}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>{data.organisation.raisonSociale}</Text>
            <Text style={styles.small}>{data.organisation.adresse}</Text>
            <Text style={styles.small}>SIRET {data.organisation.siret ?? '—'}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.title}>Facture {data.numero}</Text>
            <Text style={styles.small}>Date : {new Date(data.dateIso).toLocaleDateString('fr-FR')}</Text>
            {data.echeanceIso ? (
              <Text style={styles.small}>Échéance : {new Date(data.echeanceIso).toLocaleDateString('fr-FR')}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.block}>
          <Text style={styles.small}>Facturé à</Text>
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>{data.client.nom}</Text>
          <Text style={styles.small}>{data.client.adresse}</Text>
        </View>

        <View>
          <View style={styles.tableHead}>
            <Text style={styles.cDesig}>Désignation</Text>
            <Text style={styles.cNum}>Qté</Text>
            <Text style={styles.cNum}>PU HT</Text>
            <Text style={styles.cNum}>TVA</Text>
            <Text style={styles.cNum}>Total HT</Text>
          </View>
          {data.lignes.map((l, i) => (
            <View style={styles.tableRow} key={i}>
              <Text style={styles.cDesig}>{l.designation}</Text>
              <Text style={styles.cNum}>{l.quantite}</Text>
              <Text style={styles.cNum}>{euros(l.puHtCents)}</Text>
              <Text style={styles.cNum}>{l.tvaTaux} %</Text>
              <Text style={styles.cNum}>{euros(l.puHtCents * l.quantite)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Total HT</Text>
            <Text>{euros(data.totalHtCents)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>TVA</Text>
            <Text>{euros(data.totalTvaCents)}</Text>
          </View>
          <View style={[styles.totalRow, styles.totalTtc]}>
            <Text>Total TTC</Text>
            <Text>{euros(data.totalTtcCents)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
