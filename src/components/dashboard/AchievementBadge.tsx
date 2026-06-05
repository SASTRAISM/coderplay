import { Star, Zap, Trophy, Target, Flame, Code2, CheckCircle2, Lock, Rocket, BookOpen, Award, TrendingUp, Clock, Moon, Sun, Swords } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Achievement } from '@/types'

interface AchievementBadgeProps {
  achievement: Achievement
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

const ICON_MAP: Record<string, React.ElementType> = {
  star: Star,
  zap: Zap,
  trophy: Trophy,
  target: Target,
  flame: Flame,
  code: Code2,
  check: CheckCircle2,
  rocket: Rocket,
  book: BookOpen,
  award: Award,
  trending: TrendingUp,
  clock: Clock,
  moon: Moon,
  sun: Sun,
  swords: Swords,
  // legacy fallbacks
  '+': CheckCircle2,
  '*': Star,
  '>': Rocket,
  '?': Lock,
}

export function AchievementBadge({ achievement, size = 'md', showLabel = true }: AchievementBadgeProps) {
  const sizeMap = { sm: 'w-10 h-10', md: 'w-14 h-14', lg: 'w-20 h-20' }
  const iconSizeMap = { sm: 'w-5 h-5', md: 'w-7 h-7', lg: 'w-10 h-10' }

  const IconComp = ICON_MAP[achievement.icon] ?? Star

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div
        className={cn(
          'rounded-2xl flex items-center justify-center border-2 transition-all',
          sizeMap[size],
          achievement.isEarned
            ? 'bg-yellow-50 border-yellow-400 shadow-sm'
            : 'bg-gray-50 border-gray-200 opacity-50'
        )}
        title={achievement.description}
      >
        <IconComp className={cn(iconSizeMap[size], achievement.isEarned ? 'text-yellow-500' : 'text-gray-400')} />
      </div>
      {showLabel && (
        <div>
          <p className={cn('text-xs font-semibold', achievement.isEarned ? 'text-gray-800' : 'text-gray-400')}>
            {achievement.title}
          </p>
          {achievement.isEarned ? (
            <p className="text-xs text-yellow-600 font-medium">+{achievement.xpReward} XP</p>
          ) : (
            <p className="text-xs text-gray-400">Locked</p>
          )}
        </div>
      )}
    </div>
  )
}
