import { PageHeaderSkeleton, TableSkeleton, LoadingAnnounce } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div>
      <LoadingAnnounce />
      <PageHeaderSkeleton />
      <TableSkeleton rows={8} cols={4} />
    </div>
  );
}
