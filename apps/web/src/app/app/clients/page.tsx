import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

const TYPE_LABEL: Record<string, string> = {
  particulier: 'Particulier',
  professionnel: 'Professionnel',
  collectivite: 'Collectivité',
  syndic: 'Syndic',
};

interface ClientRow {
  id: string;
  nom: string;
  type: string;
  telephone: string | null;
  email: string | null;
}

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('clients')
    .select('id, nom, type, telephone, email')
    .order('nom', { ascending: true })
    .limit(100);
  const clients = (data ?? []) as ClientRow[];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="text-sm text-slate-500">Particuliers, professionnels, collectivités et syndics.</p>
        </div>
        <Link
          href="/app/clients/nouveau"
          className="rounded-lg bg-bordero px-4 py-2 text-sm font-medium text-white hover:bg-bordero-500"
        >
          + Nouveau client
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Téléphone</th>
              <th className="px-4 py-3 font-medium">Email</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clients && clients.length > 0 ? (
              clients.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    <Link href={`/app/clients/${c.id}`} className="hover:underline">
                      {c.nom}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{TYPE_LABEL[c.type] ?? c.type}</td>
                  <td className="px-4 py-3 text-slate-600">{c.telephone ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{c.email ?? '—'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                  Aucun client pour l'instant. Importez votre fichier ou créez le premier.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
