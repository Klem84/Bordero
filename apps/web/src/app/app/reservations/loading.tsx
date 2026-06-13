import { PageHeaderSkeleton, CardGridSkeleton, LoadingAnnounce } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div>
      <LoadingAnnounce />
      <PageHeaderSkeleton />
      <CardGridSkeleton count={4} />
    </div>
  );
}
