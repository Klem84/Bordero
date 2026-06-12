import * as React from 'react';
import { cn } from '@/lib/cn';

export type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-ink-muted',
  brand: 'bg-brand-subtle text-brand-ink',
  success: 'bg-success-subtle text-success',
  warning: 'bg-warning-subtle text-[oklch(0.5_0.13_70)]',
  danger: 'bg-danger-subtle text-danger',
  info: 'bg-info-subtle text-info',
};

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}
