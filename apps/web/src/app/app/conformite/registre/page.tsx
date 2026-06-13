import { FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { buttonClasses } from '@/components/ui/button';
import { Table, Thead, Th, Tbody, Tr, Td, EmptyRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { BORDEREAU_STATUT } from '@/lib/statuts';

interface BordereauRow {
  id: string;
  numero: string;
  type: string;
  statut: string;
  created_at: string;
  quantite_pompee_m3: number | null;
  pdf_url: string | null;
}

export const metadata = { title: "Registre" };

export default async function RegistrePage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; from?: string; to?: string }>;
}) {
  const { statut, from, to } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('bordereaux')
    .select('id, numero, type, statut, created_at, quantite_pompee_m3, pdf_url')
    .order('created_at', { ascending: false })
    .limit(500);
  if (statut) query = query.eq('statut', statut);
  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', to);

  const { data } = await query;
  const bordereaux = (data ?? []) as BordereauRow[];

  const params = new URLSearchParams();
  if (statut) params.set('statut', statut);
  if (from) params.set('from', from);
  if (to) params.set('to', to);

  const inputCls =
    'h-9 rounded-lg border border-border bg-surface px-2 text-sm text-ink outline-none focus-visible:shadow-ring';

  return (
    <div>
      <PageHeader
        title="Registre des bordereaux"
        subtitle="Classé par date, conservation 10 ans. À présenter en cas de contrôle."
        actions={
          <a
            href={`/app/conformite/registre/export?${params.toString()}`}
            className={buttonClasses('secondary', 'md')}
          >
            Exporter (CSV)
          </a>
        }
      />

      <form className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs text-ink-muted">Statut</span>
          <Select name="statut" defaultValue={statut ?? ''} className="h-9 w-44">
            <option value="">Tous</option>
            {Object.entries(BORDEREAU_STATUT).map(([v, s]) => (
              <option key={v} value={v}>
                {s.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs text-ink-muted">Du</span>
          <input type="date" name="from" defaultValue={from ?? ''} className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs text-ink-muted">Au</span>
          <input type="date" name="to" defaultValue={to ?? ''} className={inputCls} />
        </label>
        <button className={buttonClasses('primary', 'sm')}>Filtrer</button>
      </form>

      <Table>
        <Thead>
          <Th>Numéro</Th>
          <Th>Type</Th>
          <Th>Date</Th>
          <Th className="text-right">Volume (m³)</Th>
          <Th>Statut</Th>
          <Th className="text-right" />
        </Thead>
        <Tbody>
          {bordereaux.length > 0 ? (
            bordereaux.map((b) => {
              const s = BORDEREAU_STATUT[b.statut] ?? { label: b.statut, tone: 'neutral' as const };
              return (
                <Tr key={b.id}>
                  <Td className="font-mono text-xs font-medium">{b.numero}</Td>
                  <Td className="text-ink-muted">{b.type}</Td>
                  <Td className="tabular text-ink-muted">
                    {new Date(b.created_at).toLocaleDateString('fr-FR')}
                  </Td>
                  <Td className="text-right tabular">{b.quantite_pompee_m3 ?? '—'}</Td>
                  <Td>
                    <Badge tone={s.tone}>{s.label}</Badge>
                  </Td>
                  <Td className="text-right">
                    {b.pdf_url ? (
                      <a href={`/app/conformite/registre/${b.id}/pdf`} className="font-medium text-brand hover:underline">
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
            <EmptyRow colSpan={6}>
              <EmptyState
                icon={FileText}
                title="Aucun bordereau sur cette période"
                description="Les bordereaux sont générés à la clôture des interventions. Clôturez une intervention terminée pour alimenter le registre."
                actionHref="/app/interventions"
                actionLabel="Voir les interventions"
              />
            </EmptyRow>
          )}
        </Tbody>
      </Table>
    </div>
  );
}
