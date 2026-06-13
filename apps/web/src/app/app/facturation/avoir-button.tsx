'use client';

import { FileMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { creerAvoir } from './actions';

export function AvoirButton({ factureId }: { factureId: string }) {
  return (
    <form
      action={creerAvoir}
      onSubmit={(e) => {
        const motif = window.prompt(
          "Créer un avoir pour cette facture ?\nMotif (facultatif) :",
          '',
        );
        if (motif === null) {
          e.preventDefault();
          return;
        }
        const input = e.currentTarget.elements.namedItem('motif') as HTMLInputElement | null;
        if (input) input.value = motif;
      }}
    >
      <input type="hidden" name="facture_id" value={factureId} />
      <input type="hidden" name="motif" value="" />
      <Button type="submit" variant="ghost" size="sm">
        <FileMinus className="h-4 w-4" /> Avoir
      </Button>
    </form>
  );
}
