import { APTITUDE_SUBJECTS } from '@/data/aptitudeData'
import AptitudeExamClient from './AptitudeExamClient'

export function generateStaticParams() {
  return APTITUDE_SUBJECTS.map(s => ({ subjectId: s.id }))
}

export default function AptitudeExamPage({ params }: { params: { subjectId: string } }) {
  return <AptitudeExamClient params={params} />
}
