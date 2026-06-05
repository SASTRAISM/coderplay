import type { jsPDF } from 'jspdf'

let logoDataUrlPromise: Promise<string | null> | null = null

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export async function getLogoDataUrl(): Promise<string | null> {
  if (typeof window === 'undefined') return null

  if (!logoDataUrlPromise) {
    logoDataUrlPromise = fetch('/logo.png')
      .then(async (response) => {
        if (!response.ok) return null
        return blobToDataUrl(await response.blob())
      })
      .catch(() => null)
  }

  return logoDataUrlPromise
}

export function formatPdfDate(value: string | number | Date | undefined | null): string {
  if (!value) return new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  }
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function drawBrandLockup(
  pdf: jsPDF,
  {
    x,
    y,
    onDark = false,
    logoDataUrl = null,
    subtitle,
  }: {
    x: number
    y: number
    onDark?: boolean
    logoDataUrl?: string | null
    subtitle?: string
  },
): number {
  const textColor = onDark ? 255 : 24
  const mutedColor = onDark ? 180 : 102
  const accent = [234, 179, 8] as const
  const logoX = x
  const logoY = y
  const logoW = 26
  const logoH = 11

  if (onDark) {
    pdf.setFillColor(10, 10, 10)
    pdf.roundedRect(logoX, logoY, logoW, logoH, 3, 3, 'F')
  } else {
    pdf.setFillColor(255, 255, 255)
    pdf.setDrawColor(226, 232, 240)
    pdf.roundedRect(logoX, logoY, logoW, logoH, 3, 3, 'FD')
  }

  if (logoDataUrl) {
    pdf.addImage(logoDataUrl, 'PNG', logoX + 1.2, logoY + 0.9, logoW - 2.4, logoH - 1.8, undefined, 'FAST')
  }

  const textX = logoX + logoW + 4
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(15)
  pdf.setTextColor(textColor, textColor, textColor)
  pdf.text('CoderPlay', textX, y + 4.8)

  const coderplayWidth = pdf.getTextWidth('CoderPlay')
  pdf.setTextColor(accent[0], accent[1], accent[2])
  pdf.text('AI', textX + coderplayWidth + 2.2, y + 4.8)

  if (subtitle) {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8.5)
    pdf.setTextColor(mutedColor, mutedColor, mutedColor)
    pdf.text(subtitle, textX, y + 9.3)
  }

  return logoH
}

export function ensurePdfSpace(
  pdf: jsPDF,
  currentY: number,
  neededHeight: number,
  bottomMargin: number,
  onAddPage?: (pdf: jsPDF) => number,
): number {
  const pageHeight = pdf.internal.pageSize.getHeight()
  if (currentY + neededHeight <= pageHeight - bottomMargin) return currentY

  pdf.addPage()
  return onAddPage ? onAddPage(pdf) : currentY
}

export function addWrappedText(
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const lines = pdf.splitTextToSize(text, maxWidth) as string[]
  pdf.text(lines, x, y)
  return y + lines.length * lineHeight
}
