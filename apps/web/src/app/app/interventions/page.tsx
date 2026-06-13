import Link from 'next/link';
import { Truck } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { buttonClasses } from '@/components/ui/button';
import { Table, Thead, Th, Tbody, Tr, Td, EmptyRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { INTERVENTION_STATUT } from '@/lib/statuts';

interface InterventionRow {
  id: string;
  status: string;
  date_prevue: string | null;
  urgence: boolean;
}

export const metadata = { title: "Interventions" };

export default async function InterventionsPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>;
}) {
  const { statut } = await searchParams;
  const supabase = await createClient();
  let query = supabase
    .from('interventions')
    .select('id, status, date_prevue, urgence')
    .order('created_at', { ascending: false })
    .limit(200);
  if (statut && INTERVENTION_STATUT[statut]) query = query.eq('status', statut);
  const { data } = await query;
  const interventions = (data ?? []) as InterventionRow[];

  return (
    <div>
      <PageHeader title="Interventions" subtitle="Suivi des interventions et clôture des bordereaux." />

      <form method="get" className="mb-4 flex items-end gap-2">
        <div>
          <label htmlFor="statut" className="mb-1.5 block text-sm font-medium text-ink">
            Filtrer par statut
          </label>
          <Select id="statut" name="statut" defaultValue={statut ?? ''} className="sm:w-56">
            <option value="">Tous les statuts</option>
            {Object.entries(INTERVENTION_STATUT).map(([v, s]) => (
              <option key={v} value={v}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
        <button type="submit" className={buttonClasses('secondary', 'md')}>
          Filtrer
        </button>
        {statut ? (
          <a href="/app/interventions" className={buttonClasses('ghost', 'md')}>
            Réinitialiser
          </a>
        ) : null}
      </form>

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
            <EmptyRow colSpan={4}>
              {statut ? (
                <EmptyState
                  icon={Truck}
                  title="Aucune intervention pour ce statut"
                  description="Aucune intervention ne correspond au filtre sélectionné."
                  actionHref="/app/interventions"
                  actionLabel="Réinitialiser le filtre"
                />
              ) : (
                <EmptyState
                  icon={Truck}
                  title="Aucune intervention"
                  description="Les interventions naissent d'une commande. Prenez une commande depuis la fiche d'un client."
                  actionHref="/app/clients"
                  actionLabel="Aller aux clients"
                />
              )}
            </EmptyRow>
          )}
        </Tbody>
      </Table>
    </div>
  );
}
