import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'

/**
 * Logo variants:
 *   nav    -- compact horizontal for navbar / sidebar (h ~44px)
 *   sidebar-- icon-only for collapsed sidebar (h ~33px)
 *   auth   -- large for auth left panels (h ~74px)
 *   footer -- medium for footer dark section (h ~58px)
 *   hero   -- largest for hero or splash (h ~98px)
 */
type LogoVariant = 'nav' | 'sidebar' | 'auth' | 'footer' | 'hero'

interface LogoProps {
  variant?: LogoVariant
  href?: string
  /**
   * Set true when logo sits on a WHITE/LIGHT background.
   * On light sections we place it inside a subtle white card so the logo treatment
   * matches the polished look used across dashboard, auth, certificates, and PDFs.
   */
  onLight?: boolean
  className?: string
}

// imgW / imgH keep the natural ~2.4:1 aspect ratio of the logo image
const variantConfig: Record<LogoVariant, {
  imgW: number; imgH: number
  textClass: string; textColorClass: string
  showText: boolean
}> = {
  nav:     { imgW: 110, imgH: 46,  textClass: 'text-sm font-bold',  textColorClass: 'text-gray-900',  showText: true  },
  sidebar: { imgW: 80,  imgH: 34,  textClass: 'text-xs font-bold',  textColorClass: 'text-gray-900',  showText: false },
  auth:    { imgW: 186, imgH: 78,  textClass: 'text-xl font-black', textColorClass: 'text-white',      showText: true  },
  footer:  { imgW: 148, imgH: 62,  textClass: 'text-base font-bold',textColorClass: 'text-white',      showText: true  },
  hero:    { imgW: 248, imgH: 104, textClass: 'text-2xl font-black',textColorClass: 'text-white',      showText: true  },
}

// Tailwind size classes for each variant (avoids inline style lint warnings)
const sizeClasses: Record<LogoVariant, string> = {
  nav:     'w-[110px] h-[46px]',
  sidebar: 'w-[80px]  h-[34px]',
  auth:    'w-[186px] h-[78px]',
  footer:  'w-[148px] h-[62px]',
  hero:    'w-[248px] h-[104px]',
}

export function Logo({ variant = 'nav', href, onLight = false, className }: LogoProps) {
  const { imgW, textClass, textColorClass, showText } = variantConfig[variant]

  const imgEl = (
    <div
      className={cn(
        'relative overflow-hidden shrink-0',
        sizeClasses[variant],
        onLight && 'rounded-2xl bg-white border border-slate-200 shadow-sm px-2 py-1'
      )}
    >
      <Image
        src="/logo.png"
        alt="CoderPlay AI logo"
        fill
        className="object-contain"
        priority={variant === 'nav' || variant === 'auth' || variant === 'hero'}
        sizes={`${imgW}px`}
      />
    </div>
  )

  const content = (
    <div className={cn('flex items-center gap-2.5', className)}>
      {imgEl}
      {showText && (
        <span className={cn(textClass, textColorClass, 'tracking-tight leading-tight whitespace-nowrap')}>
          CoderPlay <span className="text-yellow-500">AI</span>
        </span>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center hover:opacity-90 transition-opacity no-underline" style={{ textDecoration: 'none' }}>
        {content}
      </Link>
    )
  }

  return content
}
