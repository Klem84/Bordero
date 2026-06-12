'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { buttonClasses } from '@/components/ui/button';

export function DateNav({
  dateValue,
  label,
  prevHref,
  nextHref,
  todayHref,
  isToday,
}: {
  dateValue: string;
  label: string;
  prevHref: string;
  nextHref: string;
  todayHref: string;
  isToday: boolean;
}) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        aria-label="Jour précédent"
        onClick={() => router.push(prevHref)}
        className={buttonClasses('secondary', 'sm', 'px-2')}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div className="min-w-[230px] text-center">
        <span className="text-sm font-semibold capitalize text-ink">{label}</span>
      </div>
      <button
        type="button"
        aria-label="Jour suivant"
        onClick={() => router.push(nextHref)}
        className={buttonClasses('secondary', 'sm', 'px-2')}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
      <input
        type="date"
        value={dateValue}
        onChange={(e) => {
          if (e.target.value) router.push(`/app/planning?date=${e.target.value}`);
        }}
        className="h-8 rounded-lg border border-border bg-surface px-2 text-[13px] text-ink outline-none focus-visible:shadow-ring"
      />
      <button
        type="button"
        onClick={() => router.push(todayHref)}
        disabled={isToday}
        className={buttonClasses('ghost', 'sm')}
      >
        Aujourd&apos;hui
      </button>
    </div>
  );
}
