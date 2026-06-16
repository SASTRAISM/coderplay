import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          yellow: '#EAB308',
          'yellow-light': '#FEF08A',
          'yellow-dark': '#CA8A04',
          black: '#0A0A0A',
          'gray-dark': '#111111',
          'gray-mid': '#1A1A1A',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-yellow': 'pulseYellow 2s infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(20px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        pulseYellow: { '0%, 100%': { boxShadow: '0 0 0 0 rgba(234, 179, 8, 0.4)' }, '50%': { boxShadow: '0 0 0 8px rgba(234, 179, 8, 0)' } },
      }
    },
  },
  plugins: [],
}
export default config
