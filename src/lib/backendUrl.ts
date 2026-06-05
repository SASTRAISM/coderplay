export function getBackendUrl(): string {
  const raw = process.env.NEXT_PUBLIC_AI_BACKEND_URL

  // Empty string -> same-origin (Vercel: rewrites proxy /api/* to Mac backend)
  if (typeof raw === 'string' && raw.trim() === '') return ''

  const envUrl = raw?.trim()
  if (envUrl) return envUrl.replace(/\/$/, '')

  // Fallback for local dev only (not used in production deployments)
  return 'http://localhost:5002'
}