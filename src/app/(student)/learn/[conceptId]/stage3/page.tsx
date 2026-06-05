import { CONCEPTS } from '@/data/concepts'
import Stage3PageClient from './Stage3PageClient'

export function generateStaticParams() {
  return Object.values(CONCEPTS).flat().map((c) => ({ conceptId: c.id }))
}

export default function Stage3Page({ params }: { params: { conceptId: string } }) {
  return <Stage3PageClient params={params} />
}
