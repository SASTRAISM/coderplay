import { LANGUAGES } from '@/data/languages'
import LanguagePageClient from './LanguagePageClient'

export function generateStaticParams() {
  return LANGUAGES.map((l) => ({ id: l.id }))
}

export default function LanguagePage({ params }: { params: { id: string } }) {
  return <LanguagePageClient params={params} />
}