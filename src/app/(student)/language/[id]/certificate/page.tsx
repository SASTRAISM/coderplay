import { LANGUAGES } from '@/data/languages'
import CertificatePageClient from './CertificatePageClient'

export function generateStaticParams() {
  return LANGUAGES.map((l) => ({ id: l.id }))
}

export default function CertificatePage({ params }: { params: { id: string } }) {
  return <CertificatePageClient params={params} />
}
