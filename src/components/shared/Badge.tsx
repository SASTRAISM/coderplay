import { cn } from '@/lib/utils'

type BadgeVariant =
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'achievement'
  | 'xp'
  | 'stage'
  | 'default'
  | 'new'

interface BadgeProps {
  label: string
  variant?: BadgeVariant
  icon?: string
  className?: string
  size?: 'sm' | 'md'
}

const variantStyles: Record<BadgeVariant, string> = {
  beginner:     'bg-green-50 text-green-700 border border-green-200',
  intermediate: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  advanced:     'bg-red-50 text-red-700 border border-red-200',
  achievement:  'bg-yellow-500 text-black',
  xp:           'bg-yellow-100 text-yellow-800 border border-yellow-300',
  stage:        'bg-gray-100 text-gray-700 border border-gray-200',
  new:          'bg-blue-50 text-blue-700 border border-blue-200',
  default:      'bg-gray-100 text-gray-700 border border-gray-200',
}

export function Badge({ label, variant = 'default', icon, className, size = 'sm' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        variantStyles[variant],
        className
      )}
    >
      {icon && <span>{icon}</span>}
      {label}
    </span>
  )
}
