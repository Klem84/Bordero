import { PageHeaderSkeleton, Skeleton, LoadingAnnounce } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div>
      <LoadingAnnounce />
      <PageHeaderSkeleton withActions />
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <Skeleton className="h-80 w-full rounded-xl lg:w-80" />
        <div className="grid flex-1 grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
