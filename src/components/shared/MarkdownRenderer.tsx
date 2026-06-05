'use client'

import React from 'react'
import { Calculator } from 'lucide-react'

interface MarkdownRendererProps {
  text: string
}

type Block =
  | { type: 'h2'; content: string }
  | { type: 'h3'; content: string }
  | { type: 'h4'; content: string }
  | { type: 'blockMath'; content: string }
  | { type: 'code'; content: string; lang?: string }
  | { type: 'bulletList'; items: string[] }
  | { type: 'numberedList'; items: string[] }
  | { type: 'paragraph'; content: string }
  | { type: 'blank' }

/** Simplify LaTeX into readable plain text */
function simplifyLatex(t: string): string {
  // 1. \text{content} -> content
  t = t.replace(/\\text\{([^}]*)\}/g, '$1')
  // 2. \mathrm{content} -> content
  t = t.replace(/\\mathrm\{([^}]*)\}/g, '$1')
  // 3. \mathbf{content} -> content
  t = t.replace(/\\mathbf\{([^}]*)\}/g, '$1')
  // 4. \mathit{content} -> content
  t = t.replace(/\\mathit\{([^}]*)\}/g, '$1')
  // 5. \frac{a}{b} -> (a/b) -- run 4 times for nested fractions
  for (let n = 0; n < 4; n++) {
    t = t.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)')
  }
  // 6. \sqrt{x} -> sqrt(x)
  t = t.replace(/\\sqrt\{([^}]*)\}/g, 'sqrt($1)')
  // 7. \left/\right delimiters
  t = t.replace(/\\left\(/g, '(')
  t = t.replace(/\\right\)/g, ')')
  t = t.replace(/\\left\[/g, '[')
  t = t.replace(/\\right\]/g, ']')
  t = t.replace(/\\left\\\{/g, '{')
  t = t.replace(/\\right\\\}/g, '}')
  t = t.replace(/\\left\|/g, '|')
  t = t.replace(/\\right\|/g, '|')
  // 8. Operators
  t = t.replace(/\\times/g, 'x')
  t = t.replace(/\\div/g, '/')
  t = t.replace(/\\cdot/g, '.')
  // 9. \% -> %
  t = t.replace(/\\%/g, '%')
  // 10. Relations
  t = t.replace(/\\leq/g, '<=')
  t = t.replace(/\\geq/g, '>=')
  t = t.replace(/\\neq/g, '!=')
  t = t.replace(/\\approx/g, '~=')
  t = t.replace(/\\pm/g, '+/-')
  t = t.replace(/\\infty/g, 'inf')
  // 11. Greek letters
  t = t.replace(/\\alpha/g, 'alpha')
  t = t.replace(/\\beta/g, 'beta')
  t = t.replace(/\\gamma/g, 'gamma')
  t = t.replace(/\\delta/g, 'delta')
  t = t.replace(/\\pi/g, 'pi')
  t = t.replace(/\\theta/g, 'theta')
  t = t.replace(/\\sigma/g, 'sigma')
  t = t.replace(/\\mu/g, 'mu')
  t = t.replace(/\\lambda/g, 'lambda')
  // 12. ^{x} -> ^x
  t = t.replace(/\^\{([^}]*)\}/g, '^$1')
  // 13. _{x} -> _x
  t = t.replace(/\_\{([^}]*)\}/g, '_$1')
  // 14. \\\\ -> |
  t = t.replace(/\\\\/g, ' | ')
  // 15. Spacing
  t = t.replace(/\\[,;:]/g, ' ')
  t = t.replace(/\\!/g, '')
  // 16. Logic symbols
  t = t.replace(/\\therefore/g, 'therefore')
  t = t.replace(/\\because/g, 'because')
  // 17. Fallback: remove remaining lone \word patterns
  t = t.replace(/\\([a-zA-Z]+)/g, '$1')
  return t.trim()
}

/** Render inline markdown: **bold**, `code`, \( inline math \) */
function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  let remaining = simplifyLatex(text)
  let key = 0

  while (remaining.length > 0) {
    // Inline math \( ... \)
    const inlineMathMatch = remaining.match(/^([\s\S]*?)\\\(([\s\S]*?)\\\)/)
    // Bold **...**
    const boldMatch = remaining.match(/^([\s\S]*?)\*\*([\s\S]*?)\*\*/)
    // Inline code `...`
    const inlineCodeMatch = remaining.match(/^([\s\S]*?)`([^`]+)`/)

    // Find which match comes earliest (smallest prefix length)
    const candidates: Array<{ prefixLen: number; tag: string; before: string; inner: string; matchLen: number }> = []

    if (inlineMathMatch) {
      candidates.push({ prefixLen: inlineMathMatch[1].length, tag: 'inlineMath', before: inlineMathMatch[1], inner: inlineMathMatch[2], matchLen: inlineMathMatch[0].length })
    }
    if (boldMatch) {
      candidates.push({ prefixLen: boldMatch[1].length, tag: 'bold', before: boldMatch[1], inner: boldMatch[2], matchLen: boldMatch[0].length })
    }
    if (inlineCodeMatch) {
      candidates.push({ prefixLen: inlineCodeMatch[1].length, tag: 'inlineCode', before: inlineCodeMatch[1], inner: inlineCodeMatch[2], matchLen: inlineCodeMatch[0].length })
    }

    if (candidates.length === 0) {
      nodes.push(<React.Fragment key={key++}>{remaining}</React.Fragment>)
      break
    }

    // Pick the earliest match
    candidates.sort((a, b) => a.prefixLen - b.prefixLen)
    const best = candidates[0]

    if (best.before) {
      nodes.push(<React.Fragment key={key++}>{best.before}</React.Fragment>)
    }

    if (best.tag === 'bold') {
      nodes.push(<strong key={key++}>{renderInline(best.inner)}</strong>)
    } else if (best.tag === 'inlineMath') {
      nodes.push(
        <span key={key++} className="bg-blue-50 px-1.5 py-0.5 rounded font-mono text-xs text-blue-800 border border-blue-100">
          {simplifyLatex(best.inner.trim())}
        </span>
      )
    } else if (best.tag === 'inlineCode') {
      nodes.push(
        <code key={key++} className="bg-gray-100 text-gray-800 font-mono text-xs px-1 rounded">
          {best.inner}
        </code>
      )
    }

    remaining = remaining.slice(best.matchLen)
  }

  return nodes
}

function parseBlocks(text: string): Block[] {
  const rawLines = text.split('\n')
  const blocks: Block[] = []
  let i = 0

  while (i < rawLines.length) {
    const line = rawLines[i]

    // Fenced code block ```
    if (line.trimStart().startsWith('```')) {
      const lang = line.trim().slice(3).trim() || undefined
      const codeLines: string[] = []
      i++
      while (i < rawLines.length && !rawLines[i].trimStart().startsWith('```')) {
        codeLines.push(rawLines[i])
        i++
      }
      i++ // skip closing ```
      blocks.push({ type: 'code', content: codeLines.join('\n'), lang })
      continue
    }

    // Block math \[ ... \]  (may span multiple lines)
    if (line.trimStart().startsWith('\\[')) {
      const mathLines: string[] = []
      // Content after \[ on same line
      const afterOpen = line.trimStart().slice(2)
      // Check if closing \] is on the same line
      const sameLineClose = afterOpen.indexOf('\\]')
      if (sameLineClose !== -1) {
        mathLines.push(afterOpen.slice(0, sameLineClose))
        i++
      } else {
        if (afterOpen.trim()) mathLines.push(afterOpen)
        i++
        while (i < rawLines.length) {
          const closeLine = rawLines[i]
          const closeIdx = closeLine.indexOf('\\]')
          if (closeIdx !== -1) {
            if (closeLine.slice(0, closeIdx).trim()) mathLines.push(closeLine.slice(0, closeIdx))
            i++
            break
          }
          mathLines.push(closeLine)
          i++
        }
      }
      blocks.push({ type: 'blockMath', content: mathLines.join(' ').trim() })
      continue
    }

    // H2 ## ...
    if (/^## /.test(line)) {
      blocks.push({ type: 'h2', content: line.slice(3).trim() })
      i++
      continue
    }

    // H3 ### ...
    if (/^### /.test(line)) {
      blocks.push({ type: 'h3', content: line.slice(4).trim() })
      i++
      continue
    }

    // H4 #### ...
    if (/^#### /.test(line)) {
      blocks.push({ type: 'h4', content: line.slice(5).trim() })
      i++
      continue
    }

    // Bullet list: lines starting with - or *
    if (/^[-*] /.test(line)) {
      const items: string[] = []
      while (i < rawLines.length && /^[-*] /.test(rawLines[i])) {
        items.push(rawLines[i].replace(/^[-*] /, ''))
        i++
      }
      blocks.push({ type: 'bulletList', items })
      continue
    }

    // Numbered list: lines starting with 1. 2. etc.
    if (/^\d+\. /.test(line)) {
      const items: string[] = []
      while (i < rawLines.length && /^\d+\. /.test(rawLines[i])) {
        items.push(rawLines[i].replace(/^\d+\. /, ''))
        i++
      }
      blocks.push({ type: 'numberedList', items })
      continue
    }

    // Blank line
    if (line.trim() === '') {
      blocks.push({ type: 'blank' })
      i++
      continue
    }

    // Paragraph
    blocks.push({ type: 'paragraph', content: line })
    i++
  }

  return blocks
}

export default function MarkdownRenderer({ text }: MarkdownRendererProps) {
  const blocks = parseBlocks(text)
  let key = 0

  return (
    <div className="w-full">
      {blocks.map((block) => {
        const k = key++
        switch (block.type) {
          case 'h2':
            return (
              <h2 key={k} className="text-base font-black text-gray-900 mb-2 mt-4 first:mt-0">
                {renderInline(simplifyLatex(block.content))}
              </h2>
            )
          case 'h3':
            return (
              <h3 key={k} className="text-sm font-bold text-gray-700 mb-1.5 mt-3">
                {renderInline(simplifyLatex(block.content))}
              </h3>
            )
          case 'h4':
            return (
              <h4 key={k} className="text-sm font-bold text-yellow-700 mb-1 mt-2 flex items-center gap-1">
                <span className="w-1 h-3 bg-yellow-400 rounded-sm shrink-0" />
                {renderInline(simplifyLatex(block.content))}
              </h4>
            )
          case 'blockMath':
            return (
              <div key={k} className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 my-3 overflow-x-auto">
                <span className="text-blue-500 font-bold text-xs uppercase tracking-wide block mb-1 flex items-center gap-1"><Calculator className="w-3 h-3 inline-block" /> Formula</span>
                <code className="text-blue-900 text-sm font-mono leading-relaxed">{simplifyLatex(block.content)}</code>
              </div>
            )
          case 'code':
            return (
              <pre key={k} className="bg-gray-900 text-green-400 font-mono text-xs p-3 rounded-xl my-2 overflow-x-auto">
                <code>{block.content}</code>
              </pre>
            )
          case 'bulletList':
            return (
              <ul key={k} className="list-none my-2 space-y-1">
                {block.items.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-800 leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />
                    <span>{renderInline(simplifyLatex(item))}</span>
                  </li>
                ))}
              </ul>
            )
          case 'numberedList':
            return (
              <ol key={k} className="list-none my-2 space-y-1">
                {block.items.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-800 leading-relaxed">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-yellow-100 text-yellow-700 font-bold text-xs flex items-center justify-center mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{renderInline(simplifyLatex(item))}</span>
                  </li>
                ))}
              </ol>
            )
          case 'blank':
            return <div key={k} className="h-2" />
          case 'paragraph':
            return (
              <p key={k} className="text-sm text-gray-800 leading-relaxed">
                {renderInline(simplifyLatex(block.content))}
              </p>
            )
          default:
            return null
        }
      })}
    </div>
  )
}
