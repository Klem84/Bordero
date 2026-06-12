import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Table, Thead, Th, Tbody, Tr, Td, EmptyRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FACTURE_STATUT } from '@/lib/statuts';

interface FactureRow {
  id: string;
  numero: string | null;
  statut: string;
  total_ttc_cents: number;
  emise_le: string | null;
  pdf_url: string | null;
}

const euros = (cents: number) =>
  (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

export default async function FacturationPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('factures')
    .select('id, numero, statut, total_ttc_cents, emise_le, pdf_url')
    .eq('kind', 'facture')
    .order('created_at', { ascending: false })
    .limit(300);
  const factures = (data ?? []) as FactureRow[];

  const totalEncaisse = factures
    .filter((f) => f.statut === 'payee')
    .reduce((s, f) => s + Number(f.total_ttc_cents), 0);
  const totalEmis = factures.reduce((s, f) => s + Number(f.total_ttc_cents), 0);

  return (
    <div>
      <PageHeader title="Facturation" subtitle="Factures émises et leur statut." />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:max-w-md">
        <Card className="p-4">
          <p className="text-xs font-medium text-ink-muted">Total émis</p>
          <p className="mt-1 text-xl font-semibold tabular text-ink">{euros(totalEmis)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-ink-muted">Encaissé</p>
          <p className="mt-1 text-xl font-semibold tabular text-success">{euros(totalEncaisse)}</p>
        </Card>
      </div>

      <Table>
        <Thead>
          <Th>Numéro</Th>
          <Th>Date</Th>
          <Th className="text-right">Montant TTC</Th>
          <Th>Statut</Th>
          <Th className="text-right" />
        </Thead>
        <Tbody>
          {factures.length > 0 ? (
            factures.map((f) => {
              const s = FACTURE_STATUT[f.statut] ?? { label: f.statut, tone: 'neutral' as const };
              return (
                <Tr key={f.id}>
                  <Td className="font-mono text-xs font-medium">{f.numero ?? '—'}</Td>
                  <Td className="tabular text-ink-muted">
                    {f.emise_le ? new Date(f.emise_le).toLocaleDateString('fr-FR') : '—'}
                  </Td>
                  <Td className="text-right tabular font-medium">{euros(Number(f.total_ttc_cents))}</Td>
                  <Td>
                    <Badge tone={s.tone}>{s.label}</Badge>
                  </Td>
                  <Td className="text-right">
                    {f.pdf_url ? (
                      <a href={`/app/facturation/${f.id}/pdf`} className="font-medium text-brand hover:underline">
                        PDF
                      </a>
                    ) : (
                      <span className="text-ink-muted/50">—</span>
                    )}
                  </Td>
                </Tr>
              );
            })
          ) : (
            <EmptyRow colSpan={5}>Aucune facture. Facturez une intervention terminée.</EmptyRow>
          )}
        </Tbody>
      </Table>
    </div>
  );
}
