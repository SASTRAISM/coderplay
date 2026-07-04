import { Suspense } from 'react'
import VerifyCertificateClient from './VerifyCertificateClient'

export default function VerifyCertificatePage() {
  return (
    <Suspense fallback={null}>
      <VerifyCertificateClient />
    </Suspense>
  )
}
