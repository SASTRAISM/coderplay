import { CheckCircle2, Trophy, Flame, BookOpen, MailOpen } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ActivityItem } from '@/types'
import { cn } from '@/lib/utils'

interface RecentActivityProps {
  activities: ActivityItem[]
}

const typeConfig: Record<ActivityItem['type'], { Icon: LucideIcon; color: string; iconClass: string }> = {
  stage_complete:  { Icon: CheckCircle2, color: 'bg-green-50 border-green-200',  iconClass: 'text-green-600' },
  achievement:     { Icon: Trophy,       color: 'bg-yellow-50 border-yellow-200', iconClass: 'text-yellow-600' },
  streak:          { Icon: Flame,        color: 'bg-orange-50 border-orange-200', iconClass: 'text-orange-500' },
  concept_start:   { Icon: BookOpen,     color: 'bg-blue-50 border-blue-200',     iconClass: 'text-blue-500' },
}

function timeAgo(date: Date): string {
  const diff = Date.now() - new Date(date).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function RecentActivity({ activities }: RecentActivityProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        <div className="flex justify-center mb-2"><MailOpen className="w-8 h-8" /></div>
        <p className="text-sm">No activity yet. Start learning!</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {activities.map((item) => {
        const config = typeConfig[item.type]
        const Icon = config.Icon
        return (
          <div key={item.id} className={cn('flex items-start gap-3 p-3 rounded-xl border', config.color)}>
            <span className="mt-0.5"><Icon className={cn('w-5 h-5', config.iconClass)} /></span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              {item.xpEarned > 0 && (
                <span className="text-xs font-bold text-yellow-600">+{item.xpEarned} XP</span>
              )}
              <span className="text-xs text-gray-400">{timeAgo(item.timestamp)}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}