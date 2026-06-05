import { LANGUAGES } from '@/data/languages'
import FinalExamClient from './FinalExamClient'

export function generateStaticParams() {
  return LANGUAGES.map((l) => ({ id: l.id }))
}

export default function FinalExamPage({ params }: { params: { id: string } }) {
  return <FinalExamClient params={params} />
}
