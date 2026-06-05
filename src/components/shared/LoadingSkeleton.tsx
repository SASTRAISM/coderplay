import { cn } from '@/lib/utils'

interface SkeletonProps { className?: string }

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('skeleton rounded-lg', className)} />
}

export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn('p-5 border border-gray-100 rounded-2xl space-y-4', className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <div className="flex justify-between items-center pt-1">
        <Skeleton className="h-2.5 w-1/3 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
    </div>
  )
}

export function SkeletonText({ lines = 3, className }: SkeletonProps & { lines?: number }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </div>
  )
}

const avatarSizeMap: Record<number, string> = {
  32: 'w-8 h-8',
  40: 'w-10 h-10',
  48: 'w-12 h-12',
  64: 'w-16 h-16',
}

export function SkeletonAvatar({ size = 40 }: { size?: 32 | 40 | 48 | 64 }) {
  return <Skeleton className={cn('rounded-full', avatarSizeMap[size] ?? 'w-10 h-10')} />
}

export function SkeletonButton({ className }: SkeletonProps) {
  return <Skeleton className={cn('h-10 rounded-full', className)} />
}

export function PageLoadingSkeleton() {
  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-3 gap-5">
        {[1,2,3].map(i => <SkeletonCard key={i} />)}
      </div>
    </div>
  )
}
