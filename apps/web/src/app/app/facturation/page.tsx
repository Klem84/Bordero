import { createClient } from '@/lib/supabase/server';

const STATUT_LABEL: Record<string, string> = {
  brouillon: 'Brouillon',
  emise: 'Émise',
  envoyee: 'Envoyée',
  payee: 'Payée',
  partiellement_payee: 'Part. payée',
  en_retard: 'En retard',
  irrecouvrable: 'Irrécouvrable',
};

interface FactureRow {
  id: string;
  numero: string | null;
  statut: string;
  total_ttc_cents: number;
  emise_le: string | null;
  pdf_url: string | null;
}

const euros = (cents: number) =>
  (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

export default async function FacturationPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('factures')
    .select('id, numero, statut, total_ttc_cents, emise_le, pdf_url')
    .eq('kind', 'facture')
    .order('created_at', { ascending: false })
    .limit(300);
  const factures = (data ?? []) as FactureRow[];

  const totalEncaisse = factures
    .filter((f) => f.statut === 'payee')
    .reduce((s, f) => s + Number(f.total_ttc_cents), 0);
  const totalEmis = factures.reduce((s, f) => s + Number(f.total_ttc_cents), 0);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Facturation</h1>
      <p className="mb-6 text-sm text-slate-500">Factures émises et leur statut.</p>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:max-w-md">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase text-slate-400">Total émis</p>
          <p className="text-lg font-semibold text-slate-800">{euros(totalEmis)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase text-slate-400">Encaissé</p>
          <p className="text-lg font-semibold text-green-700">{euros(totalEncaisse)}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Numéro</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Montant TTC</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {factures.length > 0 ? (
              factures.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{f.numero ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {f.emise_le ? new Date(f.emise_le).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{euros(Number(f.total_ttc_cents))}</td>
                  <td className="px-4 py-3 text-slate-600">{STATUT_LABEL[f.statut] ?? f.statut}</td>
                  <td className="px-4 py-3 text-right">
                    {f.pdf_url ? (
                      <a href={`/app/facturation/${f.id}/pdf`} className="text-bordero hover:underline">
                        PDF
                      </a>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  Aucune facture. Facturez une intervention terminée.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
