import Link from 'next/link';
import { Plus, Users } from 'lucide-react';
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
      <PageHeader
        title="Clients"
        subtitle="Particuliers, professionnels, collectivités et syndics."
        actions={
          <Link href="/app/clients/nouveau" className={buttonClasses('primary', 'md')}>
            <Plus className="h-4 w-4" /> Nouveau client
          </Link>
        }
      />

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
              <EmptyState
                icon={Users}
                title="Aucun client pour l'instant"
                description="Créez votre premier client pour pouvoir prendre des commandes et générer des bordereaux."
                actionHref="/app/clients/nouveau"
                actionLabel="Nouveau client"
              />
            </EmptyRow>
          )}
        </Tbody>
      </Table>
    </div>
  );
}
