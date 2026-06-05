/** @type {import('next').NextConfig} */
const isVercel = !!process.env.VERCEL
// Server-side only (not NEXT_PUBLIC_) — never exposed to the browser
const backendUrl = (process.env.BACKEND_URL || '').replace(/\/$/, '')

const nextConfig = {
  // Static export for DGX deployment; disabled on Vercel (uses SSR/serverless)
  ...(isVercel ? {} : { output: 'export', distDir: 'dist' }),
  trailingSlash: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  // On Vercel: proxy /api/* to the Mac backend so the URL stays server-side
  ...(isVercel && backendUrl
    ? {
        async rewrites() {
          return [
            {
              source: '/api/:path*',
              destination: `${backendUrl}/api/:path*`,
            },
          ]
        },
      }
    : {}),
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ignored: ['**/backend/**', '**/.git/**', '**/node_modules/**'],
        aggregateTimeout: 200,
      }
    }
    return config
  },
}

module.exports = nextConfig
