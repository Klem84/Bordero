const TUILES = [
  { titre: "Aujourd'hui", desc: 'Interventions du jour par statut, incidents en cours.' },
  { titre: 'Conformité', desc: 'Bordereaux à régulariser, quotas, échéances, bilan annuel.' },
  { titre: 'Trésorerie', desc: 'Encaissé du mois, retards de paiement.' },
  { titre: 'CA dormant', desc: 'Installations à échéance sans RDV, valorisées.' },
  { titre: 'Activité', desc: 'm³ pompés et interventions du mois.' },
  { titre: "File d'attente", desc: 'Commandes non planifiées les plus anciennes.' },
];

export default function DashboardPage() {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Tableau de bord</h1>
      <p className="mb-6 text-sm text-slate-500">L'état de santé de l'entreprise en un coup d'œil.</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TUILES.map((t) => (
          <div key={t.titre} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-800">{t.titre}</h2>
            <p className="mt-1 text-sm text-slate-500">{t.desc}</p>
            <p className="mt-4 text-xs italic text-slate-400">Données à venir (Sprint 8).</p>
          </div>
        ))}
      </div>
    </div>
  );
}
