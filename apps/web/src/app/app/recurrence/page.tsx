import Link from 'next/link';
import { PiggyBank, AlarmClock, CalendarClock, Phone, Mail, MessageSquare, Check, X, ChevronsRight, RefreshCw } from 'lucide-react';
import { statutEcheance, valoriserCaDormant, type StatutEcheance } from '@bordero/core';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge, type Tone } from '@/components/ui/badge';
import { Button, buttonClasses } from '@/components/ui/button';
import { Table, Thead, Th, Tbody, Tr, Td, EmptyRow } from '@/components/ui/table';
import { OUVRAGE_TYPE } from '@/lib/statuts';
import { eurosRond as euros, dateFr } from '@/lib/format';
import { planifierRelance, marquerRelance, avancerRelance, genererRelancesDues } from './actions';

const ETAPE: Record<string, { label: string; tone: Tone }> = {
  recurrence_R1: { label: 'R1', tone: 'info' },
  recurrence_R2: { label: 'R2', tone: 'warning' },
  recurrence_R3: { label: 'R3', tone: 'danger' },
};
const PROCHAINE_ETAPE: Record<string, string> = {
  recurrence_R1: 'R2',
  recurrence_R2: 'R3',
};

/** Tarif indicatif de valorisation du CA dormant (80 € HT / m³). */
const TARIF_M3_CENTS = 8000;

interface RecurrenceRow {
  id: string;
  type: string;
  volume_m3: number | null;
  date_derniere_intervention: string | null;
  date_prochaine_echeance: string | null;
  site_adresse: string | null;
  client_id: string;
  client_nom: string | null;
  relance_active: boolean;
}

interface RelanceRow {
  id: string;
  client_id: string | null;
  type: string;
  canal: string | null;
  planifie_le: string | null;
}

const ECHEANCE_BADGE: Record<StatutEcheance, { label: string; tone: Tone }> = {
  depassee: { label: 'En retard', tone: 'danger' },
  proche: { label: 'Bientôt', tone: 'warning' },
  a_jour: { label: 'À jour', tone: 'success' },
  inconnue: { label: 'Inconnue', tone: 'neutral' },
};

const CANAL_ICON: Record<string, typeof Phone> = {
  telephone: Phone,
  email: Mail,
  sms: MessageSquare,
};
const CANAL_LABEL: Record<string, string> = {
  telephone: 'Téléphone',
  email: 'Email',
  sms: 'SMS',
};

export const metadata = { title: "Récurrence" };

export default async function RecurrencePage() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: recData }, { data: relData }, { data: cliData }] = await Promise.all([
    supabase.from('v_recurrence_ouvrages').select('*').order('date_prochaine_echeance'),
    supabase
      .from('relances')
      .select('id, client_id, type, canal, planifie_le')
      .eq('statut', 'planifiee')
      .like('type', 'recurrence%')
      .order('planifie_le', { ascending: false }),
    supabase.from('clients').select('id, nom'),
  ]);

  const rows = (recData ?? []) as RecurrenceRow[];
  const relances = (relData ?? []) as RelanceRow[];
  const clientNom = new Map(
    ((cliData ?? []) as { id: string; nom: string }[]).map((c) => [c.id, c.nom]),
  );

  const withStatut = rows.map((r) => ({
    ...r,
    statut: statutEcheance(r.date_prochaine_echeance, today),
    valeurCents: Math.round((r.volume_m3 ?? 0) * TARIF_M3_CENTS),
  }));

  const enRetard = withStatut.filter((r) => r.statut === 'depassee');
  const proches = withStatut.filter((r) => r.statut === 'proche');
  const caDormantCents = valoriserCaDormant(
    enRetard.map((r) => ({ volumeM3: r.volume_m3 ?? 0 })),
    TARIF_M3_CENTS,
  );

  const kpis = [
    {
      titre: 'CA dormant',
      valeur: euros(caDormantCents),
      sous: `${enRetard.length} installation${enRetard.length > 1 ? 's' : ''} en retard`,
      icon: PiggyBank,
      tone: 'brand' as const,
    },
    {
      titre: 'En retard',
      valeur: String(enRetard.length),
      sous: 'entretiens dépassés',
      icon: AlarmClock,
      tone: enRetard.length > 0 ? ('danger' as const) : ('success' as const),
    },
    {
      titre: 'Échéances proches',
      valeur: String(proches.length),
      sous: 'sous 6 semaines',
      icon: CalendarClock,
      tone: proches.length > 0 ? ('warning' as const) : ('success' as const),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Récurrence"
        subtitle="Le chiffre d'affaires dormant et les relances d'entretien."
        actions={
          <form action={genererRelancesDues}>
            <Button type="submit" variant="secondary" size="sm">
              <RefreshCw className="h-4 w-4" /> Générer les relances dues
            </Button>
          </form>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.titre} className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink-muted">{k.titre}</span>
                <Badge tone={k.tone}>
                  <Icon className="h-3.5 w-3.5" />
                </Badge>
              </div>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-ink tabular">{k.valeur}</p>
              <p className="mt-1 text-sm text-ink-muted">{k.sous}</p>
            </Card>
          );
        })}
      </div>

      <h2 className="mb-3 text-sm font-semibold text-ink">Installations à relancer</h2>
      <Table>
        <Thead>
          <Th>Client</Th>
          <Th>Ouvrage</Th>
          <Th>Dernier entretien</Th>
          <Th>Échéance</Th>
          <Th className="text-right">Valeur estimée</Th>
          <Th className="text-right">Action</Th>
        </Thead>
        <Tbody>
          {withStatut.length > 0 ? (
            withStatut.map((r) => (
              <Tr key={r.id}>
                <Td>
                  <Link href={`/app/clients/${r.client_id}`} className="font-medium text-brand hover:underline">
                    {r.client_nom}
                  </Link>
                </Td>
                <Td className="text-ink-muted">
                  <span className="font-medium text-ink">{OUVRAGE_TYPE[r.type] ?? r.type}</span>
                  {r.site_adresse ? <span className="block text-xs">{r.site_adresse}</span> : null}
                </Td>
                <Td className="tabular text-ink-muted">{dateFr(r.date_derniere_intervention)}</Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <Badge tone={ECHEANCE_BADGE[r.statut].tone}>{ECHEANCE_BADGE[r.statut].label}</Badge>
                    <span className="tabular text-xs text-ink-muted">
                      {r.date_prochaine_echeance
                        ? new Date(r.date_prochaine_echeance).toLocaleDateString('fr-FR')
                        : ''}
                    </span>
                  </div>
                </Td>
                <Td className="text-right font-mono tabular text-ink">{euros(r.valeurCents)}</Td>
                <Td className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {r.relance_active ? (
                      <Badge tone="info">Relance planifiée</Badge>
                    ) : (
                      <form action={planifierRelance}>
                        <input type="hidden" name="ouvrage_id" value={r.id} />
                        <input type="hidden" name="canal" value="telephone" />
                        <Button type="submit" variant="secondary" size="sm">
                          Planifier
                        </Button>
                      </form>
                    )}
                    <Link
                      href={`/app/commandes/nouvelle?client=${r.client_id}`}
                      className={buttonClasses('ghost', 'sm')}
                    >
                      Commande
                    </Link>
                  </div>
                </Td>
              </Tr>
            ))
          ) : (
            <EmptyRow colSpan={6}>
              Aucune échéance enregistrée. Renseignez la périodicité des ouvrages sur les fiches clients.
            </EmptyRow>
          )}
        </Tbody>
      </Table>

      <h2 className="mb-3 mt-8 text-sm font-semibold text-ink">Relances planifiées</h2>
      <Card>
        <div className="divide-y divide-border">
          {relances.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-ink-muted">
              Aucune relance en attente. Planifiez une relance depuis le tableau ci-dessus.
            </p>
          ) : (
            relances.map((rel) => {
              const Icon = CANAL_ICON[rel.canal ?? 'telephone'] ?? Phone;
              return (
                <div key={rel.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-subtle text-brand-ink">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-ink">
                        {rel.client_id ? (clientNom.get(rel.client_id) ?? 'Client') : 'Client'}
                      </p>
                      <Badge tone={ETAPE[rel.type]?.tone ?? 'neutral'}>
                        {ETAPE[rel.type]?.label ?? 'R?'}
                      </Badge>
                    </div>
                    <p className="text-xs text-ink-muted">
                      Relance d'entretien · {CANAL_LABEL[rel.canal ?? 'telephone'] ?? rel.canal}
                      {rel.planifie_le
                        ? ` · à faire le ${new Date(rel.planifie_le).toLocaleDateString('fr-FR')}`
                        : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <form action={marquerRelance}>
                      <input type="hidden" name="relance_id" value={rel.id} />
                      <input type="hidden" name="statut" value="traitee" />
                      <Button type="submit" variant="secondary" size="sm">
                        <Check className="h-4 w-4" /> Aboutie
                      </Button>
                    </form>
                    {PROCHAINE_ETAPE[rel.type] ? (
                      <form action={avancerRelance}>
                        <input type="hidden" name="relance_id" value={rel.id} />
                        <Button type="submit" variant="secondary" size="sm">
                          <ChevronsRight className="h-4 w-4" /> Sans réponse → {PROCHAINE_ETAPE[rel.type]}
                        </Button>
                      </form>
                    ) : null}
                    <form action={marquerRelance}>
                      <input type="hidden" name="relance_id" value={rel.id} />
                      <input type="hidden" name="statut" value="annulee" />
                      <button
                        type="submit"
                        aria-label="Annuler la relance"
                        className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-danger-subtle hover:text-danger"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
