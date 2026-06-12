import { createClient } from '@/lib/supabase/server';

const STATUT_LABEL: Record<string, string> = {
  EMIS: 'Émis',
  SIGNE_CLIENT: 'Signé client',
  DEPOSE: 'Déposé',
  BOUCLE: 'Bouclé',
  ANNULE: 'Annulé',
};

interface BordereauRow {
  id: string;
  numero: string;
  type: string;
  statut: string;
  created_at: string;
  quantite_pompee_m3: number | null;
}

export default async function RegistrePage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; from?: string; to?: string }>;
}) {
  const { statut, from, to } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('bordereaux')
    .select('id, numero, type, statut, created_at, quantite_pompee_m3')
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
  const exportHref = `/app/conformite/registre/export?${params.toString()}`;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Registre des bordereaux</h1>
          <p className="text-sm text-slate-500">
            Classé par date, conservation 10 ans. À présenter en cas de contrôle.
          </p>
        </div>
        <a
          href={exportHref}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Exporter (CSV)
        </a>
      </div>

      <form className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Statut</span>
          <select name="statut" defaultValue={statut ?? ''} className="rounded-lg border border-slate-300 px-2 py-1">
            <option value="">Tous</option>
            {Object.entries(STATUT_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Du</span>
          <input type="date" name="from" defaultValue={from ?? ''} className="rounded-lg border border-slate-300 px-2 py-1" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Au</span>
          <input type="date" name="to" defaultValue={to ?? ''} className="rounded-lg border border-slate-300 px-2 py-1" />
        </label>
        <button className="rounded-lg bg-bordero px-3 py-1.5 font-medium text-white hover:bg-bordero-500">
          Filtrer
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Numéro</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Volume (m³)</th>
              <th className="px-4 py-3 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {bordereaux.length > 0 ? (
              bordereaux.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{b.numero}</td>
                  <td className="px-4 py-3 text-slate-600">{b.type}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(b.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{b.quantite_pompee_m3 ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{STATUT_LABEL[b.statut] ?? b.statut}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  Aucun bordereau sur cette période.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
