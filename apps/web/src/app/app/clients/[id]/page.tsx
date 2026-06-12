import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { buttonClasses } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CLIENT_TYPE, OUVRAGE_TYPE } from '@/lib/statuts';

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

  const { data: sitesData } = await supabase.from('sites').select('id, adresse').eq('client_id', id);
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
    <div>
      <Link href="/app/clients" className="mb-3 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Clients
      </Link>
      <PageHeader
        title={client.nom}
        subtitle={CLIENT_TYPE[client.type] ?? client.type}
        actions={
          <Link href={`/app/commandes/nouvelle?client=${client.id}`} className={buttonClasses('primary', 'md')}>
            <Plus className="h-4 w-4" /> Nouvelle commande
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Info label="Téléphone" value={client.telephone} mono />
        <Info label="Email" value={client.email} />
        <Info label="Sites" value={String(sites.length)} />
      </div>

      <h2 className="mb-3 text-sm font-semibold text-ink">Sites et ouvrages</h2>
      <div className="space-y-4">
        {sites.length === 0 ? (
          <p className="text-sm text-ink-muted">Aucun site enregistré.</p>
        ) : (
          sites.map((site) => {
            const liste = ouvrages.filter((o) => o.site_id === site.id);
            return (
              <Card key={site.id} className="p-4">
                <p className="font-medium text-ink">{site.adresse}</p>
                <ul className="mt-2 space-y-1.5">
                  {liste.length > 0 ? (
                    liste.map((o) => {
                      const enRetard = o.date_prochaine_echeance
                        ? new Date(o.date_prochaine_echeance) < new Date()
                        : false;
                      return (
                        <li key={o.id} className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
                          <span className="font-medium text-ink">{OUVRAGE_TYPE[o.type] ?? o.type}</span>
                          {o.volume_nominal_litres ? <span>· {o.volume_nominal_litres} L</span> : null}
                          {o.date_prochaine_echeance ? (
                            <Badge tone={enRetard ? 'warning' : 'neutral'}>
                              Échéance {new Date(o.date_prochaine_echeance).toLocaleDateString('fr-FR')}
                            </Badge>
                          ) : null}
                        </li>
                      );
                    })
                  ) : (
                    <li className="text-sm italic text-ink-muted">Aucun ouvrage.</li>
                  )}
                </ul>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</p>
      <p className={'mt-1 text-sm font-medium text-ink' + (mono ? ' font-mono' : '')}>{value ?? '—'}</p>
    </Card>
  );
}
