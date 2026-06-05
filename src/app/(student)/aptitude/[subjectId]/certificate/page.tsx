import { APTITUDE_SUBJECTS } from '@/data/aptitudeData'
import AptitudeCertificateClient from './AptitudeCertificateClient'

export function generateStaticParams() {
  return APTITUDE_SUBJECTS.map(s => ({ subjectId: s.id }))
}

export default function AptitudeCertificatePage({ params }: { params: { subjectId: string } }) {
  return <AptitudeCertificateClient params={params} />
}
