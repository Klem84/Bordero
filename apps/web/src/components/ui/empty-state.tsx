import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { buttonClasses } from '@/components/ui/button';

/**
 * État vide standard : icône, titre, phrase qui apprend l'interface, et une
 * action claire (DESIGN.md « jamais "rien ici" »). Utilisable seul ou dans un
 * EmptyRow de table.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      {Icon ? (
        <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-subtle text-brand-ink">
          <Icon className="h-5 w-5" />
        </span>
      ) : null}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p> : null}
      {actionHref && actionLabel ? (
        <Link href={actionHref} className={buttonClasses('primary', 'sm', 'mt-4')}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
