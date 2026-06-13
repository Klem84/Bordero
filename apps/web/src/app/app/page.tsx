import Link from 'next/link';
import { CalendarCheck, ShieldCheck, Wallet, PiggyBank, Droplets, Inbox, ClipboardList, CheckSquare, type LucideIcon } from 'lucide-react';
import { valoriserCaDormant } from '@bordero/core';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { eurosRond as euros, dateFr } from '@/lib/format';
import { cn } from '@/lib/cn';

interface TacheRow {
  id: string;
  libelle: string;
  echeance: string | null;
}

export const metadata = { title: 'Tableau de bord' };

export default async function DashboardPage() {
  const supabase = await createClient();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const { count: interventionsJour } = await supabase
    .from('interventions')
    .select('*', { count: 'exact', head: true })
    .eq('date_prevue', today);

  const { count: fileAttente } = await supabase
    .from('interventions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'BROUILLON');

  const { count: reservationsNouvelles } = await supabase
    .from('demandes_reservation')
    .select('*', { count: 'exact', head: true })
    .eq('statut', 'nouvelle');

  const { data: bordMois } = await supabase
    .from('bordereaux')
    .select('quantite_pompee_m3')
    .eq('statut', 'BOUCLE')
    .gte('created_at', monthStart);
  const m3Mois = ((bordMois ?? []) as { quantite_pompee_m3: number | null }[]).reduce(
    (s, b) => s + Number(b.quantite_pompee_m3 ?? 0),
    0,
  );

  const { data: regul } = await supabase
    .from('bordereaux')
    .select('created_at')
    .in('statut', ['SIGNE_CLIENT', 'DEPOSE']);
  const aRegulariser = ((regul ?? []) as { created_at: string }[]).filter(
    (b) => Date.now() - new Date(b.created_at).getTime() > 48 * 3600 * 1000,
  ).length;

  const { data: ouvragesRetard } = await supabase
    .from('ouvrages')
    .select('volume_nominal_litres')
    .lt('date_prochaine_echeance', today);
  const ouvrages = (ouvragesRetard ?? []) as { volume_nominal_litres: number | null }[];
  const caDormantCents = valoriserCaDormant(
    ouvrages.map((o) => ({ volumeM3: (o.volume_nominal_litres ?? 0) / 1000 })),
    8000,
  );

  const { data: paie } = await supabase
    .from('paiements')
    .select('montant_cents')
    .gte('recu_le', monthStart);
  const encaisseMois = ((paie ?? []) as { montant_cents: number }[]).reduce(
    (s, p) => s + Number(p.montant_cents),
    0,
  );

  const { data: tachesData } = await supabase
    .from('taches')
    .select('id, libelle, echeance')
    .eq('statut', 'a_faire')
    .order('echeance', { ascending: true, nullsFirst: false })
    .limit(6);
  const taches = (tachesData ?? []) as TacheRow[];

  const tuiles: {
    titre: string;
    valeur: string;
    sous: string;
    href: string;
    icon: LucideIcon;
    accent?: 'success' | 'warning';
  }[] = [
    { titre: "Aujourd'hui", valeur: `${interventionsJour ?? 0}`, sous: 'interventions planifiées', href: '/app/interventions', icon: CalendarCheck },
    {
      titre: 'Conformité',
      valeur: aRegulariser === 0 ? 'À jour' : `${aRegulariser}`,
      sous: aRegulariser === 0 ? 'rien à régulariser' : 'bordereaux à régulariser',
      href: '/app/conformite',
      icon: ShieldCheck,
      accent: aRegulariser === 0 ? 'success' : 'warning',
    },
    {
      titre: 'Réservations',
      valeur: `${reservationsNouvelles ?? 0}`,
      sous: 'demandes à traiter',
      href: '/app/reservations',
      icon: Inbox,
      accent: (reservationsNouvelles ?? 0) > 0 ? 'warning' : undefined,
    },
    { titre: 'Trésorerie', valeur: euros(encaisseMois), sous: 'encaissé ce mois', href: '/app/facturation', icon: Wallet },
    { titre: 'CA dormant', valeur: euros(caDormantCents), sous: `${ouvrages.length} installations à relancer`, href: '/app/recurrence', icon: PiggyBank },
    { titre: 'Activité', valeur: `${m3Mois.toFixed(1)} m³`, sous: 'pompés ce mois', href: '/app/conformite/registre', icon: Droplets },
    { titre: "File d'attente", valeur: `${fileAttente ?? 0}`, sous: 'commandes non planifiées', href: '/app/interventions', icon: ClipboardList },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Tableau de bord</h1>
        <p className="mt-1 text-sm text-ink-muted">L'état de santé de l'entreprise en un coup d'œil.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tuiles.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.titre}
              href={t.href}
              className="group rounded-xl border border-border bg-surface p-5 shadow-card transition-shadow duration-150 hover:shadow-card-hover"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink-muted">{t.titre}</span>
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg',
                    t.accent === 'success'
                      ? 'bg-success-subtle text-success'
                      : t.accent === 'warning'
                        ? 'bg-warning-subtle text-[oklch(0.5_0.13_70)]'
                        : 'bg-brand-subtle text-brand-ink',
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                </span>
              </div>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-ink tabular">{t.valeur}</p>
              <p className="mt-1 text-sm text-ink-muted">{t.sous}</p>
            </Link>
          );
        })}
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold text-ink">Tâches à faire</h2>
      <Card>
        {taches.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title="Aucune tâche en attente"
            description="Les relances d'entretien à passer apparaissent ici. Générez-les depuis la récurrence."
            actionHref="/app/recurrence"
            actionLabel="Voir la récurrence"
          />
        ) : (
          <ul className="divide-y divide-border">
            {taches.map((t) => {
              const enRetard = t.echeance ? new Date(t.echeance) < new Date(today) : false;
              return (
                <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-subtle text-brand-ink">
                    <CheckSquare className="h-4 w-4" />
                  </span>
                  <p className="min-w-0 flex-1 truncate text-sm text-ink">{t.libelle}</p>
                  {t.echeance ? (
                    <span className={cn('shrink-0 text-xs tabular', enRetard ? 'text-danger' : 'text-ink-muted')}>
                      {dateFr(t.echeance)}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
