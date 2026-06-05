import { CONCEPTS } from '@/data/concepts'
import Stage1PageClient from './Stage1PageClient'

export function generateStaticParams() {
  return Object.values(CONCEPTS).flat().map((c) => ({ conceptId: c.id }))
}

export default function Stage1Page({ params }: { params: { conceptId: string } }) {
  return <Stage1PageClient params={params} />
}