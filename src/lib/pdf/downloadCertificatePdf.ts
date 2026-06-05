import { drawBrandLockup, formatPdfDate, getLogoDataUrl } from './pdfCommon'

export interface CertificatePdfData {
  filename: string
  studentName: string
  courseTitle: string
  certificateId: string
  issuedOn?: string | Date
  conceptsCompleted: number
  registrationNumber?: string
  branch?: string
  year?: string
  tier?: string
}

// Tier colour palette
function tierColors(tier: string | undefined): {
  pill: [number, number, number]
  pillBorder: [number, number, number]
  pillText: [number, number, number]
  label: string
} {
  switch (tier) {
    case 'Elite':
      return { pill: [237, 233, 254], pillBorder: [167, 139, 250], pillText: [76, 29, 149], label: 'Elite' }
    case 'Diamond':
      return { pill: [207, 250, 254], pillBorder: [103, 232, 249], pillText: [14, 116, 144], label: 'Diamond' }
    case 'Gold':
      return { pill: [254, 249, 195], pillBorder: [234, 179, 8],   pillText: [113, 63, 18],  label: 'Gold' }
    case 'Silver':
      return { pill: [243, 244, 246], pillBorder: [156, 163, 175], pillText: [55, 65, 81],   label: 'Silver' }
    case 'Bronze':
      return { pill: [254, 243, 199], pillBorder: [217, 119, 6],   pillText: [120, 53, 15],  label: 'Bronze' }
    default:
      return { pill: [243, 244, 246], pillBorder: [156, 163, 175], pillText: [55, 65, 81],   label: '' }
  }
}

function cx(pdf: import('jspdf').jsPDF): number {
  return pdf.internal.pageSize.getWidth() / 2
}

function drawCenteredText(
  pdf: import('jspdf').jsPDF,
  text: string,
  y: number,
  size: number,
  color: [number, number, number],
  font: 'helvetica' | 'times' = 'helvetica',
  style: 'normal' | 'bold' | 'italic' | 'bolditalic' = 'normal',
) {
  pdf.setFont(font, style)
  pdf.setFontSize(size)
  pdf.setTextColor(color[0], color[1], color[2])
  pdf.text(text, cx(pdf), y, { align: 'center' })
}

function drawSeal(
  pdf: import('jspdf').jsPDF,
  x: number,
  y: number,
  outer: [number, number, number],
  inner: [number, number, number],
) {
  pdf.setFillColor(outer[0], outer[1], outer[2])
  pdf.circle(x, y, 17, 'F')
  pdf.setFillColor(inner[0], inner[1], inner[2])
  pdf.circle(x, y, 13.5, 'F')
  pdf.setDrawColor(247, 216, 120)
  pdf.setLineWidth(0.7)
  pdf.circle(x, y, 11.2, 'S')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8)
  pdf.setTextColor(247, 216, 120)
  pdf.text('VERIFIED', x, y - 2.5, { align: 'center' })
  pdf.setFontSize(14)
  pdf.setTextColor(255, 255, 255)
  pdf.text('CPA', x, y + 5, { align: 'center' })
  pdf.setFontSize(6.5)
  pdf.setTextColor(247, 216, 120)
  pdf.text('ACHIEVEMENT', x, y + 10, { align: 'center' })
}

function drawTierPill(
  pdf: import('jspdf').jsPDF,
  centerX: number,
  y: number,
  label: string,
  fill: [number, number, number],
  border: [number, number, number],
  textColor: [number, number, number],
) {
  const w = 56
  const h = 11
  const x = centerX - w / 2
  pdf.setFillColor(fill[0], fill[1], fill[2])
  pdf.setDrawColor(border[0], border[1], border[2])
  pdf.setLineWidth(0.6)
  pdf.roundedRect(x, y, w, h, 5.5, 5.5, 'FD')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(textColor[0], textColor[1], textColor[2])
  pdf.text(`${label} Tier`, centerX, y + h / 2 + 1.5, { align: 'center' })
}

export async function downloadCertificatePdf(data: CertificatePdfData) {
  const [{ jsPDF }, logoDataUrl] = await Promise.all([import('jspdf'), getLogoDataUrl()])

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true })

  const W = pdf.internal.pageSize.getWidth()   // 297
  const H = pdf.internal.pageSize.getHeight()  // 210

  // Colours
  const navy:     [number, number, number] = [29,  54,  107]
  const deepBlue: [number, number, number] = [15,  69,  119]
  const gold:     [number, number, number] = [225, 177, 60]
  const goldDark: [number, number, number] = [175, 120, 10]
  const orange:   [number, number, number] = [210, 75,  20]
  const slate:    [number, number, number] = [80,  94,  126]
  const cream:    [number, number, number] = [255, 252, 244]

  const issuedOn    = formatPdfDate(data.issuedOn)
  const learnerMeta = [data.registrationNumber, data.branch, data.year ? `Year ${data.year}` : ''].filter(Boolean).join('   *   ')
  const courseHeadline = `${data.courseTitle.toUpperCase()} PROGRAMMING`
  const tc = tierColors(data.tier)

  // -- Background --------------------------------------------------------------
  pdf.setFillColor(cream[0], cream[1], cream[2])
  pdf.rect(0, 0, W, H, 'F')

  // Outer gold border
  pdf.setFillColor(gold[0], gold[1], gold[2])
  pdf.roundedRect(5, 5, W - 10, H - 10, 8, 8, 'F')

  // White inner area
  pdf.setFillColor(255, 255, 255)
  pdf.roundedRect(9, 9, W - 18, H - 18, 6, 6, 'F')

  // Inner fine border
  pdf.setDrawColor(goldDark[0], goldDark[1], goldDark[2])
  pdf.setLineWidth(0.7)
  pdf.roundedRect(12, 12, W - 24, H - 24, 5, 5, 'S')

  // Decorative corner triangle -- bottom-left
  pdf.setFillColor(deepBlue[0], deepBlue[1], deepBlue[2])
  pdf.triangle(9, H - 36, 9, H - 9, 36, H - 9, 'F')
  pdf.setFillColor(gold[0], gold[1], gold[2])
  pdf.triangle(9, H - 22, 9, H - 9, 22, H - 9, 'F')

  // Blue accent bars -- left & right
  pdf.setFillColor(navy[0], navy[1], navy[2])
  pdf.rect(9, 90, 5, 65, 'F')
  pdf.rect(W - 14, 118, 5, 50, 'F')

  // -- Header -------------------------------------------------------------------
  drawBrandLockup(pdf, { x: 22, y: 17, logoDataUrl, subtitle: 'Verified learning credential' })

  drawSeal(pdf, W - 36, 32, gold, navy)

  // -- Certificate title --------------------------------------------------------
  drawCenteredText(pdf, 'CERTIFICATE', 52, 32, navy, 'times', 'normal')
  drawCenteredText(pdf, 'OF ACHIEVEMENT', 64, 17, navy, 'times', 'normal')

  // Thin gold rule under title
  pdf.setDrawColor(goldDark[0], goldDark[1], goldDark[2])
  pdf.setLineWidth(0.4)
  pdf.line(cx(pdf) - 55, 68, cx(pdf) + 55, 68)

  // -- Recipient ----------------------------------------------------------------
  drawCenteredText(pdf, 'This certifies that', 79, 11, slate)
  drawCenteredText(pdf, data.studentName, 95, 26, orange, 'times', 'bold')

  pdf.setDrawColor(goldDark[0], goldDark[1], goldDark[2])
  pdf.setLineWidth(0.55)
  pdf.line(30, 100, W - 30, 100)

  // -- Course -------------------------------------------------------------------
  drawCenteredText(pdf, 'has successfully completed the course', 112, 11, navy)
  drawCenteredText(pdf, courseHeadline, 124, 19, navy, 'helvetica', 'bold')

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(slate[0], slate[1], slate[2])
  const desc = 'with verified completion of guided lessons, assessments, and coding practice inside CoderPlay AI.'
  const descLines = pdf.splitTextToSize(desc, 200) as string[]
  pdf.text(descLines, cx(pdf), 134, { align: 'center' })

  // -- Tier pill ----------------------------------------------------------------
  if (data.tier && data.tier !== 'Failed' && tc.label) {
    drawTierPill(pdf, cx(pdf), 145, tc.label, tc.pill, tc.pillBorder, tc.pillText)
  }

  // -- Footer row ---------------------------------------------------------------
  const footerY = 165

  // Issue Date -- left
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8.5)
  pdf.setTextColor(slate[0], slate[1], slate[2])
  pdf.text('Issue Date', 28, footerY)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.setTextColor(navy[0], navy[1], navy[2])
  pdf.text(issuedOn, 28, footerY + 7)

  // Credential ID -- centre
  pdf.setFillColor(248, 250, 255)
  pdf.setDrawColor(215, 224, 242)
  pdf.setLineWidth(0.5)
  pdf.roundedRect(cx(pdf) - 42, footerY - 5, 84, 17, 3, 3, 'FD')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8)
  pdf.setTextColor(slate[0], slate[1], slate[2])
  pdf.text('CREDENTIAL ID', cx(pdf), footerY + 0.5, { align: 'center' })
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9.5)
  pdf.setTextColor(navy[0], navy[1], navy[2])
  const credLines = pdf.splitTextToSize(data.certificateId, 76) as string[]
  pdf.text(credLines, cx(pdf), footerY + 7.5, { align: 'center' })

  // Verified Learner -- right
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8.5)
  pdf.setTextColor(slate[0], slate[1], slate[2])
  pdf.text('Verified Learner Record', W - 28, footerY, { align: 'right' })
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8.5)
  pdf.setTextColor(navy[0], navy[1], navy[2])
  const metaLines = pdf.splitTextToSize(learnerMeta || `${data.conceptsCompleted} concepts completed`, 80) as string[]
  pdf.text(metaLines, W - 28, footerY + 7, { align: 'right' })

  // -- Bottom rule + footer text -------------------------------------------------
  pdf.setDrawColor(goldDark[0], goldDark[1], goldDark[2])
  pdf.setLineWidth(0.4)
  pdf.line(18, H - 15, W - 18, H - 15)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7.5)
  pdf.setTextColor(slate[0], slate[1], slate[2])
  pdf.text('Verified achievement credential issued digitally by CoderPlay AI', cx(pdf), H - 9, { align: 'center' })

  pdf.save(data.filename)
}
