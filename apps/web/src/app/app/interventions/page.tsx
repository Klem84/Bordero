import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

const STATUT_LABEL: Record<string, string> = {
  BROUILLON: 'Brouillon',
  PLANIFIEE: 'Planifiée',
  EN_ROUTE: 'En route',
  SUR_SITE: 'Sur site',
  TERMINEE: 'Terminée',
  IMPOSSIBLE: 'Impossible',
  CLOTUREE: 'Clôturée',
  ANNULEE: 'Annulée',
};

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
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Interventions</h1>
      <p className="mb-6 text-sm text-slate-500">Suivi des interventions et clôture des bordereaux.</p>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Référence</th>
              <th className="px-4 py-3 font-medium">Date prévue</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {interventions.length > 0 ? (
              interventions.map((i) => (
                <tr key={i.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">
                    {i.id.slice(0, 8)}
                    {i.urgence ? <span className="ml-2 rounded bg-red-100 px-1.5 text-xs text-red-700">Urgence</span> : null}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {i.date_prevue ? new Date(i.date_prevue).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{STATUT_LABEL[i.status] ?? i.status}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/app/interventions/${i.id}`} className="text-bordero hover:underline">
                      Ouvrir
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                  Aucune intervention. Créez une commande pour en générer.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
