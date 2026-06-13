import { PageHeaderSkeleton, TableSkeleton, Skeleton, LoadingAnnounce } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div>
      <LoadingAnnounce />
      <PageHeaderSkeleton />
      <div className="mb-6 grid grid-cols-2 gap-4 sm:max-w-md">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
      <TableSkeleton rows={6} cols={5} />
    </div>
  );
}
