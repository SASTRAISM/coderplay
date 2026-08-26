// -----------------------------------------------------------------------------
// Certificate PDF generator -- stamps dynamic text/QR/badge onto a pre-designed
// background image (rasterized from Mockup.pdf). No native jsPDF shapes are
// drawn; the mockup image carries all borders, backgrounds, and decorative
// artwork.
// -----------------------------------------------------------------------------

import {
  MOCKUP_BG_BASE64,
  BADGE_DIAMOND_BASE64,
  BADGE_GOLD_BASE64,
  BADGE_SILVER_BASE64,
  BADGE_PASS_BASE64,
} from './certificateAssets'

export interface CertificatePdfData {
  filename: string
  studentName: string
  courseTitle: string
  registrationNumber: string
  certificateId: string
  internalScore: number
  externalScore: number
  overallScore: number
}

export type CertificateTier = 'Diamond' | 'Gold' | 'Silver' | 'Pass' | 'Failed'

export function generateCertificateId(uid: string, langId: string): string {
  const base = `${uid}-${langId}`.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const hex = base.toString(16).toUpperCase().padStart(8, '0')
  return `CPA-${langId.toUpperCase()}-${hex}`
}

// -----------------------------------------------------------------------------
// Asset dictionary -- paste production Base64 strings here.
// -----------------------------------------------------------------------------

/** Tier badges, keyed by the passing tiers only. */
const BADGES: Record<Exclude<CertificateTier, 'Failed'>, string> = {
  Diamond: BADGE_DIAMOND_BASE64,
  Gold: BADGE_GOLD_BASE64,
  Silver: BADGE_SILVER_BASE64,
  Pass: BADGE_PASS_BASE64,
}

// -----------------------------------------------------------------------------
// Tier classification
// -----------------------------------------------------------------------------

export function getCertificateTier(overallScore: number): CertificateTier {
  if (overallScore >= 90) return 'Diamond'
  if (overallScore >= 80) return 'Gold'
  if (overallScore >= 60) return 'Silver'
  if (overallScore >= 40) return 'Pass'
  return 'Failed'
}

// -----------------------------------------------------------------------------
// Layout constants (A4 landscape, mm) -- measured directly against Mockup.pdf
// rasterized at 2526x1785px (297mm x 210mm, so 1px = 0.1176mm).
// -----------------------------------------------------------------------------

const NAVY: [number, number, number] = [30, 70, 158] // #1E469E
const BLACK: [number, number, number] = [0, 0, 0]

const NAME_Y = 105
const COURSE_Y = 134
const REG_NO_VALUE_X = 101
const REG_NO_Y = 115.75
const EVAL_Y = 166.5
const INTERNAL_VALUE_X = 80
const EXTERNAL_VALUE_X = 168
const OVERALL_VALUE_X = 243
const CERT_ID_VALUE_X = 65
const CERT_ID_Y = 187
const BADGE_X = 225
const BADGE_Y = 25
const BADGE_SIZE = 35
const QR_X = 39.75
const QR_Y = 174
const QR_SIZE = 22

const MAX_NAME_WIDTH_MM = 220

function cx(pdf: import('jspdf').jsPDF): number {
  return pdf.internal.pageSize.getWidth() / 2
}

/** Truncates exceptionally long names to the first 2-3 words so the layout doesn't break. */
function fitNameToWidth(pdf: import('jspdf').jsPDF, name: string, fontSize: number): string {
  pdf.setFont('times', 'bold')
  pdf.setFontSize(fontSize)

  if (pdf.getTextWidth(name) <= MAX_NAME_WIDTH_MM) return name

  const words = name.trim().split(/\s+/)
  for (const wordCount of [3, 2]) {
    const truncated = words.slice(0, wordCount).join(' ')
    if (words.length <= wordCount || pdf.getTextWidth(truncated) <= MAX_NAME_WIDTH_MM) {
      return truncated
    }
  }
  return words[0] ?? name
}

function drawCenteredText(
  pdf: import('jspdf').jsPDF,
  text: string,
  y: number,
  size: number,
  color: [number, number, number],
  font: 'helvetica' | 'times',
  style: 'normal' | 'bold',
) {
  pdf.setFont(font, style)
  pdf.setFontSize(size)
  pdf.setTextColor(color[0], color[1], color[2])
  pdf.text(text, cx(pdf), y, { align: 'center' })
}

function drawValue(pdf: import('jspdf').jsPDF, text: string, x: number, y: number) {
  pdf.setFont('times', 'normal')
  pdf.setFontSize(11)
  pdf.setTextColor(BLACK[0], BLACK[1], BLACK[2])
  pdf.text(text, x, y)
}

function getVerificationBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')
}

export async function downloadCertificatePdf(data: CertificatePdfData) {
  const [{ jsPDF }, QRCode] = await Promise.all([
    import('jspdf'),
    import('qrcode').then((mod) => mod.default),
  ])

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true })

  const W = pdf.internal.pageSize.getWidth() // 297
  const H = pdf.internal.pageSize.getHeight() // 210

  // 1. Background mockup -------------------------------------------------------
  pdf.addImage(MOCKUP_BG_BASE64, 'PNG', 0, 0, W, H, undefined, 'FAST')

  // 2. Tier badge ---------------------------------------------------------------
  const tier = getCertificateTier(data.overallScore)
  if (tier !== 'Failed') {
    const badge = BADGES[tier]
    if (badge) {
      pdf.addImage(badge, 'PNG', BADGE_X, BADGE_Y, BADGE_SIZE, BADGE_SIZE, undefined, 'FAST')
    }
  }

  // 3. QR code --------------------------------------------------------------------
  const verificationUrl = `${getVerificationBaseUrl()}/verify?certId=${encodeURIComponent(data.certificateId)}`
  const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, { margin: 1 })
  pdf.addImage(qrCodeDataUrl, 'PNG', QR_X, QR_Y, QR_SIZE, QR_SIZE, undefined, 'FAST')

  // 4. Dynamic text -----------------------------------------------------------
  const displayName = fitNameToWidth(pdf, data.studentName, 40)
  drawCenteredText(pdf, displayName, NAME_Y, 40, NAVY, 'times', 'bold')

  drawCenteredText(pdf, data.courseTitle, COURSE_Y, 25, NAVY, 'times', 'bold')

  drawValue(pdf, data.registrationNumber, REG_NO_VALUE_X, REG_NO_Y)

  drawValue(pdf, String(data.internalScore)+"/25", INTERNAL_VALUE_X , EVAL_Y)
  drawValue(pdf, String(data.externalScore)+"/75", EXTERNAL_VALUE_X, EVAL_Y)
  drawValue(pdf, String(data.overallScore)+"/100", OVERALL_VALUE_X, EVAL_Y)

  drawValue(pdf, data.certificateId, CERT_ID_VALUE_X, CERT_ID_Y)

  pdf.save(data.filename)
}
