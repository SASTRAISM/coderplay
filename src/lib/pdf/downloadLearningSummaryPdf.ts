import type { AssessmentQuestion, CodingChallenge, CodeSubmission, UserAnswer } from '@/types'
import { addWrappedText, drawBrandLockup, ensurePdfSpace, formatPdfDate, getLogoDataUrl } from './pdfCommon'

export interface LearningSummarySection {
  heading: string | null
  lines: string[]
}

export interface LearningSummaryPdfData {
  filename: string
  studentName: string
  conceptTitle: string
  languageTitle: string
  completedAt?: string | Date
  totalXp: number
  overallScore: number
  assessmentPercent: number
  assessmentCorrect: number
  assessmentWrong: number
  assessmentTotal: number
  aiLearningPercent: number
  aiLearningDetail: string
  codingPercent: number
  codingCompletedCount: number
  codingTotalCount: number
  codingPassedTests: number
  codingTotalTests: number
  scoreFootnote: string
  keyPoints: string[]
  notesSections: LearningSummarySection[]
  questions: AssessmentQuestion[]
  answers: UserAnswer[]
  challenges: Array<{
    challenge: CodingChallenge
    submission: CodeSubmission | null
  }>
}

function drawMetricCard(
  pdf: import('jspdf').jsPDF,
  {
    x,
    y,
    width,
    height,
    label,
    value,
    detail,
    accent,
  }: {
    x: number
    y: number
    width: number
    height: number
    label: string
    value: string
    detail: string
    accent: [number, number, number]
  },
) {
  pdf.setFillColor(248, 250, 252)
  pdf.setDrawColor(226, 232, 240)
  pdf.roundedRect(x, y, width, height, 4, 4, 'FD')

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8.5)
  pdf.setTextColor(100, 116, 139)
  pdf.text(label.toUpperCase(), x + 4, y + 6)

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(18)
  pdf.setTextColor(accent[0], accent[1], accent[2])
  pdf.text(value, x + 4, y + 15)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8.5)
  pdf.setTextColor(71, 85, 105)
  addWrappedText(pdf, detail, x + 4, y + 21, width - 8, 4)
}

function drawSectionHeader(
  pdf: import('jspdf').jsPDF,
  title: string,
  subtitle: string,
  logoDataUrl: string | null,
) {
  const pageWidth = pdf.internal.pageSize.getWidth()
  pdf.setFillColor(255, 255, 255)
  pdf.rect(0, 0, pageWidth, 22, 'F')
  drawBrandLockup(pdf, {
    x: 14,
    y: 6,
    logoDataUrl,
    subtitle: 'Learning summary',
  })

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(15)
  pdf.setTextColor(15, 23, 42)
  pdf.text(title, pageWidth - 14, 10, { align: 'right' })

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8.5)
  pdf.setTextColor(100, 116, 139)
  pdf.text(subtitle, pageWidth - 14, 15, { align: 'right' })

  pdf.setDrawColor(226, 232, 240)
  pdf.line(14, 19, pageWidth - 14, 19)
}

function renderCoverPage(
  pdf: import('jspdf').jsPDF,
  data: LearningSummaryPdfData,
  logoDataUrl: string | null,
) {
  const pageWidth = pdf.internal.pageSize.getWidth()

  pdf.setFillColor(15, 23, 42)
  pdf.rect(0, 0, pageWidth, 58, 'F')
  drawBrandLockup(pdf, {
    x: 14,
    y: 10,
    onDark: true,
    logoDataUrl,
    subtitle: 'AI-guided learning summary',
  })

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.setTextColor(234, 179, 8)
  pdf.text(data.languageTitle.toUpperCase(), 14, 31)

  pdf.setFontSize(26)
  pdf.setTextColor(255, 255, 255)
  pdf.text(data.conceptTitle, 14, 42)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.setTextColor(203, 213, 225)
  pdf.text(`Prepared for ${data.studentName} on ${formatPdfDate(data.completedAt)}`, 14, 49)

  pdf.setFillColor(255, 255, 255)
  pdf.setDrawColor(226, 232, 240)
  pdf.roundedRect(14, 66, pageWidth - 28, 22, 6, 6, 'FD')

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9.5)
  pdf.setTextColor(100, 116, 139)
  pdf.text('OVERALL SCORE', 20, 76)

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(28)
  pdf.setTextColor(15, 23, 42)
  pdf.text(`${data.overallScore}/100`, 20, 85)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(71, 85, 105)
  pdf.text(data.scoreFootnote, pageWidth - 20, 80, { align: 'right', maxWidth: 82 })

  const cardWidth = (pageWidth - 34) / 2
  drawMetricCard(pdf, {
    x: 14,
    y: 98,
    width: cardWidth,
    height: 28,
    label: 'Total XP',
    value: `+${data.totalXp}`,
    detail: 'XP earned across all 3 learning stages',
    accent: [202, 138, 4],
  })
  drawMetricCard(pdf, {
    x: 20 + cardWidth,
    y: 98,
    width: cardWidth,
    height: 28,
    label: 'Assessment',
    value: `${data.assessmentPercent}%`,
    detail: `${data.assessmentCorrect}/${data.assessmentTotal} correct, ${data.assessmentWrong} to review`,
    accent: [22, 163, 74],
  })
  drawMetricCard(pdf, {
    x: 14,
    y: 132,
    width: cardWidth,
    height: 28,
    label: 'AI Learning',
    value: `${data.aiLearningPercent}%`,
    detail: data.aiLearningDetail,
    accent: [2, 132, 199],
  })
  drawMetricCard(pdf, {
    x: 20 + cardWidth,
    y: 132,
    width: cardWidth,
    height: 28,
    label: 'Coding',
    value: `${data.codingCompletedCount}/${data.codingTotalCount}`,
    detail: `${data.codingPassedTests}/${data.codingTotalTests} tests passed . ${data.codingPercent}%`,
    accent: [147, 51, 234],
  })

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(13)
  pdf.setTextColor(15, 23, 42)
  pdf.text('Key takeaways', 14, 174)

  let cursorY = 182
  data.keyPoints.slice(0, 8).forEach((point) => {
    pdf.setFillColor(250, 250, 250)
    pdf.setDrawColor(229, 231, 235)
    const boxHeight = 10
    pdf.roundedRect(14, cursorY - 6.5, pageWidth - 28, boxHeight, 3, 3, 'FD')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(234, 179, 8)
    pdf.text('-', 18, cursorY)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(51, 65, 85)
    addWrappedText(pdf, point, 22, cursorY, pageWidth - 42, 4.5)
    cursorY += 12
  })
}

export async function downloadLearningSummaryPdf(data: LearningSummaryPdfData) {
  const [{ jsPDF }, logoDataUrl] = await Promise.all([
    import('jspdf'),
    getLogoDataUrl(),
  ])

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const margin = 14
  const answerLookup = new Map(data.answers.map((answer) => [answer.questionId, answer]))

  renderCoverPage(pdf, data, logoDataUrl)

  pdf.addPage()
  drawSectionHeader(pdf, 'Stage 1 - Concept notes', data.conceptTitle, logoDataUrl)
  let cursorY = 30

  for (const section of data.notesSections) {
    const estimatedHeight = 10 + Math.max(section.lines.length, 1) * 6
    cursorY = ensurePdfSpace(pdf, cursorY, estimatedHeight, margin, (doc) => {
      drawSectionHeader(doc, 'Stage 1 - Concept notes', data.conceptTitle, logoDataUrl)
      return 30
    })

    if (section.heading) {
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(12)
      pdf.setTextColor(15, 23, 42)
      pdf.text(section.heading.replace(/^#{1,3}\s*/, ''), margin, cursorY)
      cursorY += 7
    }

    for (const line of section.lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      const looksLikeCode =
        /^\s{2,}/.test(line) ||
        trimmed.startsWith('#') ||
        trimmed.startsWith('//') ||
        trimmed.startsWith('def ') ||
        trimmed.startsWith('class ') ||
        trimmed.startsWith('for ') ||
        trimmed.startsWith('if ') ||
        trimmed.startsWith('while ') ||
        trimmed.startsWith('print(') ||
        trimmed.startsWith('import ')

      if (looksLikeCode) {
        const codeLines = pdf.splitTextToSize(line, pageWidth - margin * 2 - 6) as string[]
        const codeHeight = codeLines.length * 4 + 6
        cursorY = ensurePdfSpace(pdf, cursorY, codeHeight + 3, margin, (doc) => {
          drawSectionHeader(doc, 'Stage 1 - Concept notes', data.conceptTitle, logoDataUrl)
          return 30
        })
        pdf.setFillColor(15, 23, 42)
        pdf.roundedRect(margin, cursorY - 1.5, pageWidth - margin * 2, codeHeight, 3, 3, 'F')
        pdf.setFont('courier', 'normal')
        pdf.setFontSize(8)
        pdf.setTextColor(125, 211, 252)
        pdf.text(codeLines, margin + 3, cursorY + 2.5)
        cursorY += codeHeight + 4
        continue
      }

      const bulletText = trimmed.replace(/^[-**]\s*/, '')
      const lineHeight = 4.5
      const textWidth = pageWidth - margin * 2 - 8
      const wrapped = pdf.splitTextToSize(bulletText, textWidth) as string[]
      const blockHeight = wrapped.length * lineHeight + 1
      cursorY = ensurePdfSpace(pdf, cursorY, blockHeight, margin, (doc) => {
        drawSectionHeader(doc, 'Stage 1 - Concept notes', data.conceptTitle, logoDataUrl)
        return 30
      })

      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9.5)
      pdf.setTextColor(51, 65, 85)
      pdf.text('-', margin, cursorY)
      pdf.text(wrapped, margin + 4, cursorY)
      cursorY += blockHeight + 2
    }

    cursorY += 2
  }

  pdf.addPage()
  drawSectionHeader(pdf, 'Stage 2 - Assessment review', data.conceptTitle, logoDataUrl)
  cursorY = 30

  for (const [index, question] of data.questions.entries()) {
    const answer = answerLookup.get(question.id)
    const correctAnswer = Array.isArray(question.correctAnswer) ? question.correctAnswer : [question.correctAnswer]
    const resolvedAnswer = question.options
      ? question.options
          .filter((option) => correctAnswer.includes(option.id))
          .map((option) => `${option.id.toUpperCase()}. ${option.text}`)
          .join(', ')
      : correctAnswer.join(', ')

    const questionLines = pdf.splitTextToSize(question.question, pageWidth - margin * 2 - 8) as string[]
    const explanationLines = pdf.splitTextToSize(question.explanation, pageWidth - margin * 2 - 8) as string[]
    const codeLines = question.code
      ? (pdf.splitTextToSize(question.code, pageWidth - margin * 2 - 10) as string[])
      : []

    const estimatedHeight =
      20 +
      questionLines.length * 5 +
      explanationLines.length * 4.5 +
      (codeLines.length > 0 ? codeLines.length * 4 + 10 : 0)

    cursorY = ensurePdfSpace(pdf, cursorY, estimatedHeight, margin, (doc) => {
      drawSectionHeader(doc, 'Stage 2 - Assessment review', data.conceptTitle, logoDataUrl)
      return 30
    })

    pdf.setFillColor(answer?.isCorrect ? 240 : 255, answer?.isCorrect ? 253 : 247, answer?.isCorrect ? 244 : 250)
    pdf.setDrawColor(answer?.isCorrect ? 134 : 251, answer?.isCorrect ? 239 : 191, answer?.isCorrect ? 172 : 36)
    pdf.roundedRect(margin, cursorY - 2, pageWidth - margin * 2, estimatedHeight - 3, 4, 4, 'FD')

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.setTextColor(15, 23, 42)
    pdf.text(`Q${index + 1}`, margin + 4, cursorY + 4)

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8.5)
    pdf.setTextColor(100, 116, 139)
    pdf.text(answer?.isCorrect ? 'Answered correctly' : 'Needs review', pageWidth - margin - 4, cursorY + 4, { align: 'right' })

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10.5)
    pdf.setTextColor(15, 23, 42)
    pdf.text(questionLines, margin + 4, cursorY + 11)

    let blockY = cursorY + 11 + questionLines.length * 5 + 1

    if (codeLines.length > 0) {
      pdf.setFillColor(15, 23, 42)
      pdf.roundedRect(margin + 4, blockY, pageWidth - margin * 2 - 8, codeLines.length * 4 + 5, 2, 2, 'F')
      pdf.setFont('courier', 'normal')
      pdf.setFontSize(7.8)
      pdf.setTextColor(125, 211, 252)
      pdf.text(codeLines, margin + 7, blockY + 3.5)
      blockY += codeLines.length * 4 + 8
    }

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(22, 163, 74)
    pdf.text('Correct answer', margin + 4, blockY)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(51, 65, 85)
    blockY = addWrappedText(pdf, resolvedAnswer, margin + 32, blockY, pageWidth - margin * 2 - 36, 4.5)

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(202, 138, 4)
    pdf.text('Why it matters', margin + 4, blockY + 1)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(71, 85, 105)
    addWrappedText(pdf, question.explanation, margin + 32, blockY + 1, pageWidth - margin * 2 - 36, 4.5)

    cursorY += estimatedHeight + 4
  }

  pdf.addPage()
  drawSectionHeader(pdf, 'Stage 3 - Coding review', data.conceptTitle, logoDataUrl)
  cursorY = 30

  for (const item of data.challenges) {
    const { challenge, submission } = item
    const summary = submission
      ? `${submission.testsPassed}/${submission.totalTests} tests passed`
      : 'No submission captured'
    const code = (submission?.code || challenge.starterCode || '').trim()
    const problemLines = pdf.splitTextToSize(challenge.problemStatement, pageWidth - margin * 2 - 8) as string[]
    const codeLines = pdf.splitTextToSize(code, pageWidth - margin * 2 - 10) as string[]
    const estimatedHeight = 24 + problemLines.length * 4.5 + Math.min(codeLines.length, 24) * 4 + 12

    cursorY = ensurePdfSpace(pdf, cursorY, estimatedHeight, margin, (doc) => {
      drawSectionHeader(doc, 'Stage 3 - Coding review', data.conceptTitle, logoDataUrl)
      return 30
    })

    pdf.setFillColor(248, 250, 252)
    pdf.setDrawColor(226, 232, 240)
    pdf.roundedRect(margin, cursorY - 2, pageWidth - margin * 2, estimatedHeight - 3, 4, 4, 'FD')

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(11)
    pdf.setTextColor(15, 23, 42)
    pdf.text(challenge.title, margin + 4, cursorY + 4)

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8.5)
    pdf.setTextColor(100, 116, 139)
    pdf.text(`${challenge.difficulty.toUpperCase()} . ${summary}`, pageWidth - margin - 4, cursorY + 4, { align: 'right' })

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(51, 65, 85)
    pdf.text(problemLines, margin + 4, cursorY + 11)

    let blockY = cursorY + 13 + problemLines.length * 4.5
    const visibleCodeLines = codeLines.slice(0, 24)
    const codeBoxHeight = visibleCodeLines.length * 4 + 5

    pdf.setFillColor(15, 23, 42)
    pdf.roundedRect(margin + 4, blockY, pageWidth - margin * 2 - 8, codeBoxHeight, 2, 2, 'F')
    pdf.setFont('courier', 'normal')
    pdf.setFontSize(7.8)
    pdf.setTextColor(125, 211, 252)
    pdf.text(visibleCodeLines, margin + 7, blockY + 3.5)
    blockY += codeBoxHeight + 4

    if (codeLines.length > visibleCodeLines.length) {
      pdf.setFont('helvetica', 'italic')
      pdf.setFontSize(8)
      pdf.setTextColor(100, 116, 139)
      pdf.text('Code shortened in PDF. Open the app for the full submission.', margin + 4, blockY)
      blockY += 5
    }

    if (challenge.examples[0]) {
      const example = challenge.examples[0]
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8.5)
      pdf.setTextColor(22, 163, 74)
      pdf.text('Example output', margin + 4, blockY)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(71, 85, 105)
      addWrappedText(
        pdf,
        `${example.input ? `Input: ${example.input} | ` : ''}Output: ${example.output}`,
        margin + 28,
        blockY,
        pageWidth - margin * 2 - 32,
        4.5,
      )
    }

    cursorY += estimatedHeight + 4
  }

  pdf.save(data.filename)
}
