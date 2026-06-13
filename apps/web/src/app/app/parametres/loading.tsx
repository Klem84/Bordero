import { PageHeaderSkeleton, Skeleton, LoadingAnnounce } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-10">
      <div>
        <LoadingAnnounce />
        <PageHeaderSkeleton />
      </div>
      {Array.from({ length: 3 }).map((_, s) => (
        <div key={s}>
          <Skeleton className="mb-3 h-4 w-40" />
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
