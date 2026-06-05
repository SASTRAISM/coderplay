import { CONCEPTS } from '@/data/concepts'
import CompletePageClient from './CompletePageClient'

export function generateStaticParams() {
  return Object.values(CONCEPTS).flat().map((c) => ({ conceptId: c.id }))
}

export default function CompletePage({ params }: { params: { conceptId: string } }) {
  return <CompletePageClient params={params} />
}
