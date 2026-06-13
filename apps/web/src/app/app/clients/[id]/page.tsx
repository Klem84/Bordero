import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { buttonClasses } from '@/components/ui/button';
import { CLIENT_TYPE } from '@/lib/statuts';
import { SitesOuvrages, type SiteWithOuvrages } from './sites-ouvrages';
import { ClientInfo } from './client-info';

const euros = (cents: number) =>
  (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('clients').select('nom').eq('id', id).maybeSingle();
  const nom = (data as { nom: string } | null)?.nom;
  return { title: nom ?? 'Client' };
}

interface ClientDetail {
  id: string;
  nom: string;
  type: string;
  telephone: string | null;
  email: string | null;
  siret: string | null;
}
interface SiteRow {
  id: string;
  adresse: string;
  instructions_acces: string | null;
}
interface OuvrageRow {
  id: string;
  site_id: string;
  type: string;
  volume_nominal_litres: number | null;
  periodicite_mois: number | null;
  date_derniere_intervention: string | null;
  date_prochaine_echeance: string | null;
  localisation: string | null;
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: clientData } = await supabase
    .from('clients')
    .select('id, nom, type, telephone, email, siret')
    .eq('id', id)
    .maybeSingle();
  const client = clientData as ClientDetail | null;
  if (!client) notFound();

  const { data: sitesData } = await supabase
    .from('sites')
    .select('id, adresse, instructions_acces')
    .eq('client_id', id)
    .order('created_at');
  const sites = (sitesData ?? []) as SiteRow[];

  const siteIds = sites.map((s) => s.id);
  let ouvrages: OuvrageRow[] = [];
  if (siteIds.length > 0) {
    const { data: ouvragesData } = await supabase
      .from('ouvrages')
      .select(
        'id, site_id, type, volume_nominal_litres, periodicite_mois, date_derniere_intervention, date_prochaine_echeance, localisation',
      )
      .in('site_id', siteIds)
      .order('created_at');
    ouvrages = (ouvragesData ?? []) as OuvrageRow[];
  }

  // Résumé de facturation du client : facturé net (factures - avoirs), encaissé, reste dû.
  const { data: facturesData } = await supabase
    .from('factures')
    .select('id, kind, total_ttc_cents')
    .eq('client_id', id);
  const facturesClient = (facturesData ?? []) as { id: string; kind: string; total_ttc_cents: number }[];
  const factureNetCents = facturesClient.reduce(
    (s, f) => s + (f.kind === 'avoir' ? -1 : 1) * Number(f.total_ttc_cents),
    0,
  );
  let encaisseCents = 0;
  const factureIds = facturesClient.map((f) => f.id);
  if (factureIds.length > 0) {
    const { data: paieData } = await supabase
      .from('paiements')
      .select('montant_cents')
      .in('facture_id', factureIds);
    encaisseCents = ((paieData ?? []) as { montant_cents: number }[]).reduce(
      (s, p) => s + Number(p.montant_cents),
      0,
    );
  }
  const resteDuCents = factureNetCents - encaisseCents;

  const sitesWithOuvrages: SiteWithOuvrages[] = sites.map((s) => ({
    id: s.id,
    adresse: s.adresse,
    instructions_acces: s.instructions_acces,
    ouvrages: ouvrages
      .filter((o) => o.site_id === s.id)
      .map((o) => ({
        id: o.id,
        type: o.type,
        volume_nominal_litres: o.volume_nominal_litres,
        periodicite_mois: o.periodicite_mois,
        date_derniere_intervention: o.date_derniere_intervention,
        localisation: o.localisation,
        date_prochaine_echeance: o.date_prochaine_echeance,
      })),
  }));

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

      <ClientInfo
        client={{
          id: client.id,
          type: client.type,
          nom: client.nom,
          telephone: client.telephone,
          email: client.email,
          siret: client.siret,
        }}
        nbSites={sites.length}
      />

      {factureIds.length > 0 ? (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Facturé</p>
            <p className="mt-1 text-lg font-semibold tabular text-ink">{euros(factureNetCents)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Encaissé</p>
            <p className="mt-1 text-lg font-semibold tabular text-success">{euros(encaisseCents)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Reste dû</p>
            <p
              className={
                'mt-1 text-lg font-semibold tabular ' + (resteDuCents > 0 ? 'text-danger' : 'text-ink')
              }
            >
              {euros(resteDuCents)}
            </p>
          </Card>
        </div>
      ) : null}

      <SitesOuvrages clientId={client.id} sites={sitesWithOuvrages} />
    </div>
  );
}
