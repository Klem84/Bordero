import { CreditCard, Receipt, FileDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Table, Thead, Th, Tbody, Tr, Td, EmptyRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button, buttonClasses } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { FACTURE_STATUT } from '@/lib/statuts';
import { isStripeConfigured, isStripeTestMode } from '@/lib/stripe';
import { creerSessionPaiement } from './actions';
import { AvoirButton } from './avoir-button';

interface FactureRow {
  id: string;
  numero: string | null;
  statut: string;
  kind: string;
  facture_origine_id: string | null;
  total_ttc_cents: number;
  emise_le: string | null;
  pdf_url: string | null;
}

const euros = (cents: number) =>
  (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

const ENCAISSABLE = new Set(['emise', 'envoyee', 'partiellement_payee', 'en_retard']);

function Banniere({ stripe, numero }: { stripe?: string; numero?: string }) {
  if (!stripe) return null;
  const map: Record<string, { tone: string; msg: string }> = {
    paye: {
      tone: 'border-success/30 bg-success-subtle text-success',
      msg: `Paiement encaissé${numero ? ` pour la facture ${numero}` : ''}. Facture marquée payée.`,
    },
    annule: {
      tone: 'border-border bg-surface-2 text-ink-muted',
      msg: 'Paiement annulé. La facture reste en attente de règlement.',
    },
    echec: {
      tone: 'border-danger/30 bg-danger-subtle text-danger',
      msg: "Le paiement n'a pas pu être confirmé. Réessayez l'encaissement.",
    },
    erreur: {
      tone: 'border-danger/30 bg-danger-subtle text-danger',
      msg: 'Une erreur est survenue avec Stripe.',
    },
    etat: {
      tone: 'border-border bg-surface-2 text-ink-muted',
      msg: "Cette facture n'est pas encaissable (brouillon ou déjà payée).",
    },
    indisponible: {
      tone: 'border-warning/30 bg-warning-subtle text-[oklch(0.5_0.13_70)]',
      msg: 'Encaissement Stripe indisponible : clé non configurée.',
    },
  };
  const b = map[stripe];
  if (!b) return null;
  return (
    <div role="status" aria-live="polite" className={`mb-5 rounded-lg border px-4 py-3 text-sm ${b.tone}`}>
      {b.msg}
    </div>
  );
}

export const metadata = { title: "Facturation" };

export default async function FacturationPage({
  searchParams,
}: {
  searchParams: Promise<{ stripe?: string; numero?: string; statut?: string }>;
}) {
  const { stripe, numero, statut } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from('factures')
    .select('id, numero, statut, kind, facture_origine_id, total_ttc_cents, emise_le, pdf_url')
    .in('kind', ['facture', 'avoir'])
    .order('created_at', { ascending: false })
    .limit(300);
  const lignesAll = (data ?? []) as FactureRow[];

  // Ensemble des factures déjà créditées par un avoir + numéros pour l'affichage.
  const avoirParOrigine = new Set(
    lignesAll.filter((f) => f.kind === 'avoir' && f.facture_origine_id).map((f) => f.facture_origine_id as string),
  );
  const numeroParId = new Map(lignesAll.map((f) => [f.id, f.numero]));

  // Totaux calculés sur l'ensemble ; le filtre ne porte que sur l'affichage.
  const totalEncaisse = lignesAll
    .filter((f) => f.kind === 'facture' && f.statut === 'payee')
    .reduce((s, f) => s + Number(f.total_ttc_cents), 0);
  const totalEmis = lignesAll
    .filter((f) => f.kind === 'facture')
    .reduce((s, f) => s + Number(f.total_ttc_cents), 0);
  const stripeOn = isStripeConfigured();

  const factures = statut ? lignesAll.filter((f) => f.statut === statut) : lignesAll;

  return (
    <div>
      <PageHeader
        title="Facturation"
        subtitle="Factures émises, encaissement et suivi des règlements."
        actions={
          <div className="flex items-center gap-2">
            {stripeOn && isStripeTestMode() ? (
              <Badge tone="info">
                <CreditCard className="h-3.5 w-3.5" /> Stripe mode test
              </Badge>
            ) : null}
            <a
              href={`/app/facturation/export${statut ? `?statut=${statut}` : ''}`}
              className={buttonClasses('secondary', 'md')}
            >
              <FileDown className="h-4 w-4" /> Exporter CSV
            </a>
          </div>
        }
      />

      <Banniere stripe={stripe} numero={numero} />

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

      <form method="get" className="mb-4 flex items-end gap-2">
        <div>
          <label htmlFor="statut" className="mb-1.5 block text-sm font-medium text-ink">
            Filtrer par statut
          </label>
          <Select id="statut" name="statut" defaultValue={statut ?? ''} className="sm:w-56">
            <option value="">Tous les statuts</option>
            {Object.entries(FACTURE_STATUT).map(([v, s]) => (
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
          <a href="/app/facturation" className={buttonClasses('ghost', 'md')}>
            Réinitialiser
          </a>
        ) : null}
      </form>

      <Table>
        <Thead>
          <Th>Numéro</Th>
          <Th>Date</Th>
          <Th className="text-right">Montant TTC</Th>
          <Th>Statut</Th>
          <Th className="text-right">Actions</Th>
        </Thead>
        <Tbody>
          {factures.length > 0 ? (
            factures.map((f) => {
              const s = FACTURE_STATUT[f.statut] ?? { label: f.statut, tone: 'neutral' as const };
              const isAvoir = f.kind === 'avoir';
              const encaissable = !isAvoir && stripeOn && ENCAISSABLE.has(f.statut);
              const avoirable = !isAvoir && f.statut !== 'brouillon' && !avoirParOrigine.has(f.id);
              return (
                <Tr key={f.id}>
                  <Td className="font-mono text-xs font-medium">
                    <span className="inline-flex items-center gap-2">
                      {f.numero ?? '—'}
                      {isAvoir ? <Badge tone="warning">Avoir</Badge> : null}
                    </span>
                    {isAvoir && f.facture_origine_id ? (
                      <span className="mt-0.5 block font-sans text-[11px] text-ink-muted">
                        sur {numeroParId.get(f.facture_origine_id) ?? '—'}
                      </span>
                    ) : null}
                  </Td>
                  <Td className="tabular text-ink-muted">
                    {f.emise_le ? new Date(f.emise_le).toLocaleDateString('fr-FR') : '—'}
                  </Td>
                  <Td className={`text-right tabular font-medium ${isAvoir ? 'text-danger' : ''}`}>
                    {euros(Number(f.total_ttc_cents))}
                  </Td>
                  <Td>
                    <Badge tone={s.tone}>{s.label}</Badge>
                  </Td>
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-3">
                      {encaissable ? (
                        <form action={creerSessionPaiement}>
                          <input type="hidden" name="facture_id" value={f.id} />
                          <Button type="submit" variant="secondary" size="sm">
                            <CreditCard className="h-4 w-4" /> Encaisser
                          </Button>
                        </form>
                      ) : null}
                      {avoirable ? <AvoirButton factureId={f.id} /> : null}
                      {f.pdf_url ? (
                        <a
                          href={`/app/facturation/${f.id}/pdf`}
                          className="font-medium text-brand hover:underline"
                        >
                          PDF
                        </a>
                      ) : (
                        <span className="text-ink-muted/50">—</span>
                      )}
                    </div>
                  </Td>
                </Tr>
              );
            })
          ) : (
            <EmptyRow colSpan={5}>
              {statut ? (
                <EmptyState
                  icon={Receipt}
                  title="Aucune facture pour ce statut"
                  description="Aucune facture ne correspond au filtre sélectionné."
                  actionHref="/app/facturation"
                  actionLabel="Réinitialiser le filtre"
                />
              ) : (
                <EmptyState
                  icon={Receipt}
                  title="Aucune facture"
                  description="Facturez une intervention terminée depuis son écran pour générer la première facture."
                  actionHref="/app/interventions"
                  actionLabel="Voir les interventions"
                />
              )}
            </EmptyRow>
          )}
        </Tbody>
      </Table>
    </div>
  );
}
