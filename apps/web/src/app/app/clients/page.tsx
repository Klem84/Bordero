import Link from 'next/link';
import { Plus, Users, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { buttonClasses } from '@/components/ui/button';
import { Table, Thead, Th, Tbody, Tr, Td, EmptyRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { CLIENT_TYPE } from '@/lib/statuts';

interface ClientRow {
  id: string;
  nom: string;
  type: string;
  telephone: string | null;
  email: string | null;
}

export const metadata = { title: "Clients" };

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const recherche = (q ?? '').trim();
  const supabase = await createClient();

  let query = supabase
    .from('clients')
    .select('id, nom, type, telephone, email')
    .order('nom', { ascending: true })
    .limit(100);
  if (recherche) {
    const motif = `%${recherche.replace(/[%,]/g, ' ')}%`;
    query = query.or(`nom.ilike.${motif},email.ilike.${motif},telephone.ilike.${motif}`);
  }
  const { data } = await query;
  const clients = (data ?? []) as ClientRow[];

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle="Particuliers, professionnels, collectivités et syndics."
        actions={
          <Link href="/app/clients/nouveau" className={buttonClasses('primary', 'md')}>
            <Plus className="h-4 w-4" /> Nouveau client
          </Link>
        }
      />

      <form method="get" className="mb-4 flex gap-2" role="search">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input
            type="search"
            name="q"
            defaultValue={recherche}
            placeholder="Rechercher un client…"
            aria-label="Rechercher un client"
            className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm text-ink outline-none placeholder:text-ink-muted focus-visible:border-brand focus-visible:shadow-ring"
          />
        </div>
        <button type="submit" className={buttonClasses('secondary', 'md')}>
          Rechercher
        </button>
        {recherche ? (
          <Link href="/app/clients" className={buttonClasses('ghost', 'md')}>
            Effacer
          </Link>
        ) : null}
      </form>

      <Table>
        <Thead>
          <Th>Nom</Th>
          <Th>Type</Th>
          <Th>Téléphone</Th>
          <Th>Email</Th>
        </Thead>
        <Tbody>
          {clients.length > 0 ? (
            clients.map((c) => (
              <Tr key={c.id}>
                <Td className="font-medium">
                  <Link href={`/app/clients/${c.id}`} className="hover:text-brand hover:underline">
                    {c.nom}
                  </Link>
                </Td>
                <Td>
                  <Badge tone={c.type === 'particulier' ? 'neutral' : 'brand'}>
                    {CLIENT_TYPE[c.type] ?? c.type}
                  </Badge>
                </Td>
                <Td className="tabular text-ink-muted">{c.telephone ?? '—'}</Td>
                <Td className="text-ink-muted">{c.email ?? '—'}</Td>
              </Tr>
            ))
          ) : (
            <EmptyRow colSpan={4}>
              {recherche ? (
                <EmptyState
                  icon={Search}
                  title={`Aucun résultat pour « ${recherche} »`}
                  description="Vérifiez l'orthographe ou effacez la recherche pour revoir tous les clients."
                  actionHref="/app/clients"
                  actionLabel="Effacer la recherche"
                />
              ) : (
                <EmptyState
                  icon={Users}
                  title="Aucun client pour l'instant"
                  description="Créez votre premier client pour pouvoir prendre des commandes et générer des bordereaux."
                  actionHref="/app/clients/nouveau"
                  actionLabel="Nouveau client"
                />
              )}
            </EmptyRow>
          )}
        </Tbody>
      </Table>
    </div>
  );
}
