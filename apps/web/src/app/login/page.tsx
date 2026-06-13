'use client';

import { useActionState } from 'react';
import { Droplets } from 'lucide-react';
import { signIn, type LoginState } from './actions';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';

const initial: LoginState = { error: null };

export default function LoginPage() {
  const [state, action, pending] = useActionState(signIn, initial);

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Panneau de marque (desktop) */}
      <aside className="relative hidden flex-col justify-between bg-sidebar p-12 lg:flex">
        <div className="flex items-center gap-2 text-sidebar-ink">
          <Droplets className="h-6 w-6 text-white" strokeWidth={2.2} />
          <span className="text-xl font-semibold tracking-tight text-white">Bordero</span>
        </div>
        <div>
          <p className="max-w-sm text-2xl font-medium leading-snug text-white">
            Du devis au bordereau réglementaire, sans papier, depuis le camion.
          </p>
          <p className="mt-4 max-w-sm text-sm text-sidebar-muted">
            Bordereaux conformes, registre 10 ans, bilan préfectoral automatique, et les fosses qui
            reviennent toutes seules.
          </p>
        </div>
        <p className="text-xs text-sidebar-muted">Conçu pour les entreprises de vidange et d'assainissement.</p>
      </aside>

      {/* Formulaire */}
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <Droplets className="h-6 w-6 text-brand" strokeWidth={2.2} />
            <span className="text-xl font-semibold tracking-tight text-ink">Bordero</span>
          </div>
          <h1 className="text-xl font-semibold text-ink">Connexion</h1>
          <p className="mt-1 text-sm text-ink-muted">Accédez à votre espace de gestion.</p>

          <form action={action} className="mt-6 space-y-4">
            <Field label="Adresse email" htmlFor="email">
              <Input id="email" name="email" type="email" required autoComplete="email" autoFocus />
            </Field>
            <Field label="Mot de passe" htmlFor="password">
              <Input id="password" name="password" type="password" required autoComplete="current-password" />
            </Field>
            {state?.error ? (
              <p className="rounded-lg bg-danger-subtle px-3 py-2 text-sm text-danger">{state.error}</p>
            ) : null}
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? 'Connexion…' : 'Se connecter'}
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
