import Link from 'next/link';
import { Inbox, MapPin, Phone, Mail, Clock, UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { buttonClasses } from '@/components/ui/button';
import { dateFr } from '@/lib/format';
import { OUVRAGE_TYPE } from '@/lib/statuts';
import { traiterDemande } from './actions';

interface DemandeRow {
  id: string;
  contact_nom: string;
  contact_telephone: string | null;
  contact_email: string | null;
  adresse: string | null;
  type_ouvrage: string | null;
  creneau_souhaite: string | null;
  message: string | null;
  statut: string;
  source: string;
  created_at: string;
}

const STATUT: Record<string, { label: string; tone: 'success' | 'warning' | 'neutral' | 'danger' }> = {
  nouvelle: { label: 'Nouvelle', tone: 'warning' },
  traitee: { label: 'Traitée', tone: 'success' },
  rejetee: { label: 'Rejetée', tone: 'neutral' },
};

export const metadata = { title: 'Réservations' };

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>;
}) {
  const { statut } = await searchParams;
  const filtre = statut && statut in STATUT ? statut : 'nouvelle';

  const supabase = await createClient();
  const { data } = await supabase
    .from('demandes_reservation')
    .select(
      'id, contact_nom, contact_telephone, contact_email, adresse, type_ouvrage, creneau_souhaite, message, statut, source, created_at',
    )
    .eq('statut', filtre)
    .order('created_at', { ascending: false })
    .limit(200);
  const demandes = (data ?? []) as DemandeRow[];

  return (
    <div>
      <PageHeader
        title="Réservations"
        subtitle="Demandes d’intervention reçues depuis le portail public, à convertir en clients."
      />

      <form className="mb-4 flex items-end gap-3 rounded-xl border border-border bg-surface p-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs text-ink-muted">Statut</span>
          <Select name="statut" defaultValue={filtre} className="h-9 w-44">
            {Object.entries(STATUT).map(([v, s]) => (
              <option key={v} value={v}>
                {s.label}
              </option>
            ))}
          </Select>
        </label>
        <button className={buttonClasses('primary', 'sm')}>Filtrer</button>
      </form>

      {demandes.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Aucune demande dans cette catégorie"
          description="Les demandes envoyées depuis votre page de réservation publique apparaissent ici."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {demandes.map((d) => {
            const s = STATUT[d.statut] ?? { label: d.statut, tone: 'neutral' as const };
            const params = new URLSearchParams();
            params.set('nom', d.contact_nom);
            if (d.contact_telephone) params.set('telephone', d.contact_telephone);
            if (d.contact_email) params.set('email', d.contact_email);
            if (d.adresse) params.set('adresse', d.adresse);
            return (
              <Card key={d.id} className="flex flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">{d.contact_nom}</p>
                  <Badge tone={s.tone}>{s.label}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-ink-muted">{dateFr(d.created_at)}</p>

                <div className="mt-2 space-y-1 text-xs text-ink-muted">
                  {d.contact_telephone ? (
                    <p className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3 shrink-0" /> {d.contact_telephone}
                    </p>
                  ) : null}
                  {d.contact_email ? (
                    <p className="flex items-center gap-1.5">
                      <Mail className="h-3 w-3 shrink-0" /> {d.contact_email}
                    </p>
                  ) : null}
                  {d.adresse ? (
                    <p className="flex items-start gap-1.5">
                      <MapPin className="mt-px h-3 w-3 shrink-0" /> {d.adresse}
                    </p>
                  ) : null}
                  {d.creneau_souhaite ? (
                    <p className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3 shrink-0" /> {d.creneau_souhaite}
                    </p>
                  ) : null}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {d.type_ouvrage ? (
                    <Badge tone="neutral">{OUVRAGE_TYPE[d.type_ouvrage] ?? d.type_ouvrage}</Badge>
                  ) : null}
                </div>

                {d.message ? (
                  <p className="mt-2 rounded-lg bg-surface-2/50 px-3 py-2 text-sm text-ink">{d.message}</p>
                ) : null}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {d.statut !== 'traitee' ? (
                    <Link href={`/app/clients/nouveau?${params.toString()}`} className={buttonClasses('primary', 'sm')}>
                      <UserPlus className="h-4 w-4" /> Créer le client
                    </Link>
                  ) : null}
                  {d.statut !== 'traitee' ? (
                    <form action={traiterDemande}>
                      <input type="hidden" name="demande_id" value={d.id} />
                      <input type="hidden" name="statut" value="traitee" />
                      <button className={buttonClasses('secondary', 'sm')}>Marquer traitée</button>
                    </form>
                  ) : null}
                  {d.statut === 'nouvelle' ? (
                    <form action={traiterDemande}>
                      <input type="hidden" name="demande_id" value={d.id} />
                      <input type="hidden" name="statut" value="rejetee" />
                      <button className={buttonClasses('ghost', 'sm')}>Rejeter</button>
                    </form>
                  ) : null}
                  {d.statut === 'rejetee' ? (
                    <form action={traiterDemande}>
                      <input type="hidden" name="demande_id" value={d.id} />
                      <input type="hidden" name="statut" value="nouvelle" />
                      <button className={buttonClasses('ghost', 'sm')}>Rouvrir</button>
                    </form>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
