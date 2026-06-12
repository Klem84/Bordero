import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Table, Thead, Th, Tbody, Tr, Td, EmptyRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { INTERVENTION_STATUT } from '@/lib/statuts';

interface InterventionRow {
  id: string;
  status: string;
  date_prevue: string | null;
  urgence: boolean;
}

export default async function InterventionsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('interventions')
    .select('id, status, date_prevue, urgence')
    .order('created_at', { ascending: false })
    .limit(200);
  const interventions = (data ?? []) as InterventionRow[];

  return (
    <div>
      <PageHeader title="Interventions" subtitle="Suivi des interventions et clôture des bordereaux." />
      <Table>
        <Thead>
          <Th>Référence</Th>
          <Th>Date prévue</Th>
          <Th>Statut</Th>
          <Th className="text-right" />
        </Thead>
        <Tbody>
          {interventions.length > 0 ? (
            interventions.map((i) => {
              const s = INTERVENTION_STATUT[i.status] ?? { label: i.status, tone: 'neutral' as const };
              return (
                <Tr key={i.id}>
                  <Td className="font-mono text-xs">
                    {i.id.slice(0, 8)}
                    {i.urgence ? (
                      <Badge tone="danger" className="ml-2">
                        Urgence
                      </Badge>
                    ) : null}
                  </Td>
                  <Td className="tabular text-ink-muted">
                    {i.date_prevue ? new Date(i.date_prevue).toLocaleDateString('fr-FR') : '—'}
                  </Td>
                  <Td>
                    <Badge tone={s.tone}>{s.label}</Badge>
                  </Td>
                  <Td className="text-right">
                    <Link href={`/app/interventions/${i.id}`} className="font-medium text-brand hover:underline">
                      Ouvrir
                    </Link>
                  </Td>
                </Tr>
              );
            })
          ) : (
            <EmptyRow colSpan={4}>Aucune intervention. Créez une commande pour en générer.</EmptyRow>
          )}
        </Tbody>
      </Table>
    </div>
  );
}
