import { Skeleton, CardGridSkeleton, TableSkeleton, PageHeaderSkeleton, LoadingAnnounce } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div>
      <LoadingAnnounce />
      <PageHeaderSkeleton />
      <div className="mb-6">
        <CardGridSkeleton count={3} />
      </div>
      <Skeleton className="mb-3 h-4 w-48" />
      <TableSkeleton rows={6} cols={6} />
    </div>
  );
}
