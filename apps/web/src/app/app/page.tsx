import Link from 'next/link';
import { valoriserCaDormant } from '@bordero/core';
import { createClient } from '@/lib/supabase/server';

const euros = (cents: number) =>
  (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

export default async function DashboardPage() {
  const supabase = await createClient();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const yearStart = `${now.getFullYear()}-01-01`;

  // Aujourd'hui
  const { count: interventionsJour } = await supabase
    .from('interventions')
    .select('*', { count: 'exact', head: true })
    .eq('date_prevue', today);

  // File d'attente (brouillons)
  const { count: fileAttente } = await supabase
    .from('interventions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'BROUILLON');

  // m³ pompés du mois (bordereaux bouclés)
  const { data: bordMois } = await supabase
    .from('bordereaux')
    .select('quantite_pompee_m3')
    .eq('statut', 'BOUCLE')
    .gte('created_at', monthStart);
  const m3Mois = ((bordMois ?? []) as { quantite_pompee_m3: number | null }[]).reduce(
    (s, b) => s + Number(b.quantite_pompee_m3 ?? 0),
    0,
  );

  // Bordereaux à régulariser (> 48h)
  const { data: regul } = await supabase
    .from('bordereaux')
    .select('created_at')
    .in('statut', ['SIGNE_CLIENT', 'DEPOSE']);
  const aRegulariser = ((regul ?? []) as { created_at: string }[]).filter(
    (b) => Date.now() - new Date(b.created_at).getTime() > 48 * 3600 * 1000,
  ).length;

  // CA dormant : ouvrages à échéance dépassée, valorisés
  const { data: ouvragesRetard } = await supabase
    .from('ouvrages')
    .select('volume_nominal_litres')
    .lt('date_prochaine_echeance', today);
  const ouvrages = (ouvragesRetard ?? []) as { volume_nominal_litres: number | null }[];
  const caDormantCents = valoriserCaDormant(
    ouvrages.map((o) => ({ volumeM3: (o.volume_nominal_litres ?? 0) / 1000 })),
    8000,
  );

  // Encaissé du mois
  const { data: paie } = await supabase
    .from('paiements')
    .select('montant_cents')
    .gte('recu_le', monthStart);
  const encaisseMois = ((paie ?? []) as { montant_cents: number }[]).reduce(
    (s, p) => s + Number(p.montant_cents),
    0,
  );

  const tuiles = [
    { titre: "Aujourd'hui", valeur: `${interventionsJour ?? 0}`, sous: 'interventions planifiées', href: '/app/interventions' },
    { titre: 'Conformité', valeur: aRegulariser === 0 ? 'OK' : `${aRegulariser}`, sous: aRegulariser === 0 ? 'rien à régulariser' : 'bordereaux à régulariser', href: '/app/conformite' },
    { titre: 'Trésorerie', valeur: euros(encaisseMois), sous: 'encaissé ce mois', href: '/app/facturation' },
    { titre: 'CA dormant', valeur: euros(caDormantCents), sous: `${ouvrages.length} installations à relancer`, href: '/app/clients' },
    { titre: 'Activité', valeur: `${m3Mois.toFixed(1)} m³`, sous: 'pompés ce mois', href: '/app/conformite/registre' },
    { titre: "File d'attente", valeur: `${fileAttente ?? 0}`, sous: 'commandes non planifiées', href: '/app/interventions' },
  ];

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Tableau de bord</h1>
      <p className="mb-6 text-sm text-slate-500">L'état de santé de l'entreprise en un coup d'œil.</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tuiles.map((t) => (
          <Link
            key={t.titre}
            href={t.href}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-bordero/40 hover:shadow"
          >
            <h2 className="text-sm font-semibold text-slate-500">{t.titre}</h2>
            <p className="mt-2 text-2xl font-bold text-slate-900">{t.valeur}</p>
            <p className="mt-1 text-xs text-slate-500">{t.sous}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
