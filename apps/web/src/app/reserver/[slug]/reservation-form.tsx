'use client';

import { useActionState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label, Input, Select } from '@/components/ui/input';
import { AddressAutocomplete } from '@/components/address-autocomplete';
import { OUVRAGE_TYPE } from '@/lib/statuts';
import { creerDemande, type ReservationState } from './actions';

const initial: ReservationState = { error: null };

export function ReservationForm({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState(creerDemande, initial);

  if (state?.ok) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col items-center gap-3 rounded-xl border border-success/30 bg-success-subtle px-6 py-10 text-center"
      >
        <CheckCircle2 className="h-10 w-10 text-success" />
        <h2 className="text-lg font-semibold text-ink">Demande envoyée</h2>
        <p className="max-w-sm text-sm text-ink-muted">
          Merci. Votre demande a bien été transmise. L’entreprise vous recontacte rapidement pour
          confirmer le rendez-vous.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="slug" value={slug} />
      {/* Piège anti-spam : invisible pour un humain, rempli par les robots. */}
      <div aria-hidden className="absolute left-[-9999px] top-[-9999px] h-0 w-0 overflow-hidden">
        <label>
          Ne pas remplir
          <input type="text" name="site_web" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="contact_nom">Votre nom *</Label>
          <Input id="contact_nom" name="contact_nom" required placeholder="Nom et prénom" />
        </div>
        <div>
          <Label htmlFor="contact_telephone">Téléphone</Label>
          <Input id="contact_telephone" name="contact_telephone" type="tel" placeholder="06 12 34 56 78" />
        </div>
      </div>

      <div>
        <Label htmlFor="contact_email">Email</Label>
        <Input id="contact_email" name="contact_email" type="email" placeholder="vous@exemple.fr" />
      </div>

      <AddressAutocomplete label="Adresse de l’intervention" name="adresse" id="adresse" />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="type_ouvrage">Type d’ouvrage</Label>
          <Select id="type_ouvrage" name="type_ouvrage" defaultValue="">
            <option value="">À préciser</option>
            {Object.entries(OUVRAGE_TYPE).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="creneau_souhaite">Créneau souhaité</Label>
          <Input id="creneau_souhaite" name="creneau_souhaite" placeholder="Ex. la semaine prochaine" />
        </div>
      </div>

      <div>
        <Label htmlFor="message">Précisions</Label>
        <textarea
          id="message"
          name="message"
          rows={3}
          placeholder="Décrivez brièvement votre besoin (fosse pleine, débouchage, accès…)."
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus-visible:shadow-ring"
        />
      </div>

      {state?.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full justify-center">
        <Send className="h-4 w-4" /> {pending ? 'Envoi…' : 'Envoyer ma demande'}
      </Button>
      <p className="text-center text-xs text-ink-muted">
        Vos coordonnées ne servent qu’à traiter votre demande d’intervention.
      </p>
    </form>
  );
}
