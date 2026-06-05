interface DownloadElementAsPdfOptions {
  element: HTMLElement
  filename: string
  orientation?: 'portrait' | 'landscape'
  marginMm?: number
  scale?: number
}

export async function downloadElementAsPdf({
  element,
  filename,
  orientation = 'portrait',
  marginMm = 10,
  scale = 2,
}: DownloadElementAsPdfOptions) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])

  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale,
    useCORS: true,
    logging: false,
  })

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
    compress: true,
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const usableWidth = pageWidth - marginMm * 2
  const usableHeight = pageHeight - marginMm * 2
  const imageHeight = (canvas.height * usableWidth) / canvas.width
  const imageData = canvas.toDataURL('image/png')

  let remainingHeight = imageHeight
  let offsetY = 0
  let pageIndex = 0

  while (remainingHeight > 0) {
    if (pageIndex > 0) pdf.addPage()

    pdf.addImage(
      imageData,
      'PNG',
      marginMm,
      marginMm - offsetY,
      usableWidth,
      imageHeight,
      undefined,
      'FAST',
    )

    remainingHeight -= usableHeight
    offsetY += usableHeight
    pageIndex += 1
  }

  pdf.save(filename)
}
