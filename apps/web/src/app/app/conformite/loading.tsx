import { PageHeaderSkeleton, CardGridSkeleton, LoadingAnnounce } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div>
      <LoadingAnnounce />
      <PageHeaderSkeleton withActions />
      <CardGridSkeleton count={3} />
    </div>
  );
}
