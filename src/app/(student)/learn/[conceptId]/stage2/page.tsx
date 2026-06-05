import { CONCEPTS } from '@/data/concepts'
import Stage2PageClient from './Stage2PageClient'

export function generateStaticParams() {
  return Object.values(CONCEPTS).flat().map((c) => ({ conceptId: c.id }))
}

export default function Stage2Page({ params }: { params: { conceptId: string } }) {
  return <Stage2PageClient params={params} />
}