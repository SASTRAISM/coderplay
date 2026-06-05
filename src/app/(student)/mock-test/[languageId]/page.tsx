import { LANGUAGES } from '@/data/languages'
import MockTestClient from './MockTestClient'

export function generateStaticParams() {
  return LANGUAGES.map(l => ({ languageId: l.id }))
}

export default function MockTestPage({ params }: { params: { languageId: string } }) {
  return <MockTestClient params={params} />
}
