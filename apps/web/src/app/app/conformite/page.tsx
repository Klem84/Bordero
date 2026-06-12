import Link from 'next/link';
import { statutEcheance, statutQuota } from '@bordero/core';
import { createClient } from '@/lib/supabase/server';

interface AgrementRow {
  id: string;
  numero: string;
  departement_code: string;
  departement_libelle: string | null;
  date_echeance: string;
  quantite_max_annuelle_m3: number | null;
  statut: string;
}
interface BordQ {
  quantite_pompee_m3: number | null;
}

const SEUIL_STYLE: Record<string, string> = {
  ok: 'bg-green-500',
  information: 'bg-bordero',
  avertissement: 'bg-amber-500',
  critique: 'bg-red-500',
};
const ECHEANCE_STYLE: Record<string, string> = {
  a_jour: 'text-green-600',
  proche: 'text-amber-600',
  depassee: 'text-red-600',
  inconnue: 'text-slate-400',
};

export default async function ConformitePage() {
  const supabase = await createClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const yearStart = `${now.getFullYear()}-01-01`;

  const { data: agrData } = await supabase
    .from('agrements')
    .select('id, numero, departement_code, departement_libelle, date_echeance, quantite_max_annuelle_m3, statut')
    .order('date_echeance');
  const agrements = (agrData ?? []) as AgrementRow[];

  const { data: bouclesData } = await supabase
    .from('bordereaux')
    .select('quantite_pompee_m3')
    .eq('statut', 'BOUCLE')
    .gte('created_at', yearStart);
  const totalM3 = ((bouclesData ?? []) as BordQ[]).reduce((s, b) => s + Number(b.quantite_pompee_m3 ?? 0), 0);

  const { data: regulData } = await supabase
    .from('bordereaux')
    .select('id, numero, statut, created_at')
    .in('statut', ['SIGNE_CLIENT', 'DEPOSE']);
  const aRegulariser = ((regulData ?? []) as { id: string; numero: string; statut: string; created_at: string }[]).filter(
    (b) => Date.now() - new Date(b.created_at).getTime() > 48 * 3600 * 1000,
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Conformité</h1>
          <p className="text-sm text-slate-500">Agréments, quotas et bordereaux à régulariser.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/app/conformite/bilan"
            className="rounded-lg bg-bordero px-4 py-2 text-sm font-medium text-white hover:bg-bordero-500"
          >
            Bilan annuel
          </Link>
          <Link
            href="/app/conformite/registre"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Registre →
          </Link>
        </div>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Agréments préfectoraux
        </h2>
        {agrements.length === 0 ? (
          <p className="text-sm text-slate-500">Aucun agrément enregistré.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {agrements.map((a) => {
              const q = statutQuota(totalM3, a.quantite_max_annuelle_m3);
              const ech = statutEcheance(a.date_echeance, nowIso);
              return (
                <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{a.numero}</span>
                    <span className="text-xs text-slate-500">
                      {a.departement_libelle ?? a.departement_code} ({a.departement_code})
                    </span>
                  </div>
                  <p className={'mt-1 text-xs ' + (ECHEANCE_STYLE[ech] ?? '')}>
                    Échéance : {new Date(a.date_echeance).toLocaleDateString('fr-FR')}
                  </p>

                  <div className="mt-4">
                    <div className="mb-1 flex justify-between text-xs text-slate-500">
                      <span>Quota annuel</span>
                      <span>
                        {totalM3.toFixed(1)} / {a.quantite_max_annuelle_m3 ?? '—'} m³ ({q.pct} %)
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={'h-full ' + (SEUIL_STYLE[q.seuil] ?? 'bg-slate-400')}
                        style={{ width: `${Math.min(100, q.pct)}%` }}
                      />
                    </div>
                    {q.seuil === 'avertissement' ? (
                      <p className="mt-1 text-xs text-amber-600">Seuil 85 % atteint : envisager une demande de modification.</p>
                    ) : null}
                    {q.seuil === 'critique' ? (
                      <p className="mt-1 text-xs text-red-600">Quota atteint : nouvelles interventions ANC à confirmer.</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Bordereaux à régulariser
        </h2>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          {aRegulariser.length === 0 ? (
            <p className="text-sm text-green-700">Aucun bordereau en attente depuis plus de 48 h. ✓</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {aRegulariser.map((b) => (
                <li key={b.id} className="flex justify-between">
                  <span className="font-medium">{b.numero}</span>
                  <span className="text-amber-600">{b.statut}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
