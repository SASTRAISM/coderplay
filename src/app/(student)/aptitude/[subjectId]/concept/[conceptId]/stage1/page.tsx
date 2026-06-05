import { APTITUDE_SUBJECTS, APTITUDE_CONCEPTS } from '@/data/aptitudeData'
import AptitudeStage1Client from './AptitudeStage1Client'

export function generateStaticParams() {
  return APTITUDE_SUBJECTS.flatMap(subject =>
    (APTITUDE_CONCEPTS[subject.id] || []).map(concept => ({
      subjectId: subject.id,
      conceptId: concept.id,
    }))
  )
}

export default function AptitudeStage1Page({ params }: { params: { subjectId: string; conceptId: string } }) {
  return <AptitudeStage1Client params={params} />
}
