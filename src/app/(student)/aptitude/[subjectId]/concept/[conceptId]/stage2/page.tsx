import { APTITUDE_SUBJECTS, APTITUDE_CONCEPTS } from '@/data/aptitudeData'
import AptitudeStage2Client from './AptitudeStage2Client'

export function generateStaticParams() {
  return APTITUDE_SUBJECTS.flatMap(subject =>
    (APTITUDE_CONCEPTS[subject.id] || []).map(concept => ({
      subjectId: subject.id,
      conceptId: concept.id,
    }))
  )
}

export default function AptitudeStage2Page({ params }: { params: { subjectId: string; conceptId: string } }) {
  return <AptitudeStage2Client params={params} />
}
