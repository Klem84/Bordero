import { createClient } from '@/lib/supabase/server';
import { PriseCommandeForm, type PrestationDTO } from '@/components/prise-commande-form';

interface ClientLite {
  id: string;
  nom: string;
}

export const metadata = { title: "Nouvelle commande" };

export default async function NouvelleCommandePage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { client } = await searchParams;
  const supabase = await createClient();

  const { data: clientsData } = await supabase.from('clients').select('id, nom').order('nom');
  const { data: prestaData } = await supabase
    .from('prestations')
    .select(
      'id, libelle, prix_base_cents, majoration_urgence_pct, majoration_weekend_pct, volume_forfait_m3, prix_m3_supplementaire_cents, tva_taux',
    )
    .eq('actif', true)
    .order('ordre');

  const clients = (clientsData ?? []) as ClientLite[];
  const prestations = (prestaData ?? []) as PrestationDTO[];

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Prise de commande</h1>
      <p className="mb-6 text-sm text-slate-500">Créez une commande complète en moins de 30 secondes.</p>
      <PriseCommandeForm clients={clients} prestations={prestations} initialClientId={client ?? null} />
    </div>
  );
}
