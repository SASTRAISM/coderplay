import { CONCEPTS } from '@/data/concepts'
import ConceptPageClient from './ConceptPageClient'

export function generateStaticParams() {
  const ids = Object.values(CONCEPTS).flat().map((c) => ({ id: c.id }))
  return ids
}

export default function ConceptPage({ params }: { params: { id: string } }) {
  return <ConceptPageClient params={params} />
}