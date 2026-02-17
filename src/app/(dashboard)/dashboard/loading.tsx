import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-4 p-5">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-14" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Compliance bar */}
      <Card>
        <CardContent className="p-5">
          <Skeleton className="mb-3 h-3 w-32" />
          <Skeleton className="h-4 w-full rounded-full" />
          <div className="mt-3 flex gap-5">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-3 w-20" />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action queue + activity */}
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Card>
          <CardContent className="p-5 space-y-3">
            <Skeleton className="h-4 w-32" />
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 space-y-3">
            <Skeleton className="h-4 w-28" />
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex gap-3 py-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-2 w-16" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
