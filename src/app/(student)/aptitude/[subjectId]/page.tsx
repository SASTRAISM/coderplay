import { APTITUDE_SUBJECTS } from '@/data/aptitudeData'
import SubjectPageClient from './SubjectPageClient'

export function generateStaticParams() {
  return APTITUDE_SUBJECTS.map(s => ({ subjectId: s.id }))
}

export default function AptitudeSubjectPage({ params }: { params: { subjectId: string } }) {
  return <SubjectPageClient params={params} />
}
