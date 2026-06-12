import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const TYPE_LABEL: Record<string, string> = {
  particulier: 'Particulier',
  professionnel: 'Professionnel',
  collectivite: 'Collectivité',
  syndic: 'Syndic',
};

const OUVRAGE_LABEL: Record<string, string> = {
  FOSSE_SEPTIQUE: 'Fosse septique',
  FOSSE_TOUTES_EAUX: 'Fosse toutes eaux',
  MICRO_STATION: 'Micro-station',
  BAC_A_GRAISSE: 'Bac à graisse',
  SEPARATEUR_HYDROCARBURES: 'Séparateur hydrocarbures',
  POSTE_RELEVAGE: 'Poste de relevage',
  CUVE_FIOUL: 'Cuve à fioul',
  CANALISATION: 'Canalisation',
  AUTRE: 'Autre',
};

interface ClientDetail {
  id: string;
  nom: string;
  type: string;
  telephone: string | null;
  email: string | null;
}
interface SiteRow {
  id: string;
  adresse: string;
}
interface OuvrageRow {
  id: string;
  site_id: string;
  type: string;
  volume_nominal_litres: number | null;
  date_prochaine_echeance: string | null;
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: clientData } = await supabase
    .from('clients')
    .select('id, nom, type, telephone, email')
    .eq('id', id)
    .maybeSingle();
  const client = clientData as ClientDetail | null;
  if (!client) notFound();

  const { data: sitesData } = await supabase
    .from('sites')
    .select('id, adresse')
    .eq('client_id', id);
  const sites = (sitesData ?? []) as SiteRow[];

  const siteIds = sites.map((s) => s.id);
  let ouvrages: OuvrageRow[] = [];
  if (siteIds.length > 0) {
    const { data: ouvragesData } = await supabase
      .from('ouvrages')
      .select('id, site_id, type, volume_nominal_litres, date_prochaine_echeance')
      .in('site_id', siteIds);
    ouvrages = (ouvragesData ?? []) as OuvrageRow[];
  }

  return (
    <div className="max-w-4xl">
      <Link href="/app/clients" className="text-sm text-slate-500 hover:underline">
        ← Clients
      </Link>
      <div className="mb-6 mt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{client.nom}</h1>
          <p className="text-sm text-slate-500">{TYPE_LABEL[client.type] ?? client.type}</p>
        </div>
        <Link
          href={`/app/commandes/nouvelle?client=${client.id}`}
          className="rounded-lg bg-bordero px-4 py-2 text-sm font-medium text-white hover:bg-bordero-500"
        >
          + Nouvelle commande
        </Link>
      </div>

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Info label="Téléphone" value={client.telephone} />
        <Info label="Email" value={client.email} />
        <Info label="Sites" value={String(sites.length)} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Sites et ouvrages
        </h2>
        <div className="space-y-4">
          {sites.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun site enregistré.</p>
          ) : (
            sites.map((site) => (
              <div key={site.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="font-medium text-slate-800">{site.adresse}</p>
                <ul className="mt-2 space-y-1">
                  {ouvrages
                    .filter((o) => o.site_id === site.id)
                    .map((o) => (
                      <li key={o.id} className="text-sm text-slate-600">
                        {OUVRAGE_LABEL[o.type] ?? o.type}
                        {o.volume_nominal_litres ? ` — ${o.volume_nominal_litres} L` : ''}
                        {o.date_prochaine_echeance
                          ? ` — prochaine échéance ${new Date(o.date_prochaine_echeance).toLocaleDateString('fr-FR')}`
                          : ''}
                      </li>
                    ))}
                  {ouvrages.filter((o) => o.site_id === site.id).length === 0 ? (
                    <li className="text-sm italic text-slate-400">Aucun ouvrage.</li>
                  ) : null}
                </ul>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-800">{value ?? '—'}</p>
    </div>
  );
}
