import { parse as parseSfc } from '@vue/compiler-sfc'
import type { DropBlockRange, DropDiagnostic, ParsedDropDocument } from './types'

function diagnostic(message: string, start = 0, end = start): DropDiagnostic {
  return { message, start, end, severity: 'error' }
}

function findOpeningTag(source: string, limit: number): { start: number, end: number } {
  let found = { start: -1, end: -1 }
  let quote: '"' | '\'' | null = null
  for (let i = 0; i < Math.min(limit, source.length); i++) {
    const char = source[i]
    if (quote) {
      if (char === quote) quote = null
      continue
    }
    if (char === '"' || char === '\'') {
      quote = char
      continue
    }
    if (source.startsWith('<drop', i) && !/[\w$-]/.test(source[i + 5] || '')) {
      let tagQuote: '"' | '\'' | null = null
      for (let j = i + 5; j < source.length; j++) {
        const next = source[j]
        if (tagQuote) {
          if (next === tagQuote) tagQuote = null
          continue
        }
        if (next === '"' || next === '\'') tagQuote = next
        else if (next === '>') {
          found = { start: i, end: j + 1 }
          i = j
          break
        }
      }
    }
  }
  return found
}

export function parseDropDocument(source: string, filename: string): ParsedDropDocument {
  const diagnostics: DropDiagnostic[] = []
  let descriptor
  try {
    const result = parseSfc(source, { filename })
    descriptor = result.descriptor
    for (const error of result.errors) {
      const loc = typeof error === 'object' && error && 'loc' in error ? (error as { loc?: { start?: { offset?: number }, end?: { offset?: number } } }).loc : undefined
      const start = Math.min(source.length, loc?.start?.offset ?? 0)
      const end = Math.min(source.length, loc?.end?.offset ?? start)
      diagnostics.push(diagnostic(String(error), start, end))
    }
  }
  catch (error) {
    diagnostics.push(diagnostic(error instanceof Error ? error.message : String(error)))
    return { filename, source, block: null, diagnostics }
  }

  const blocks = descriptor.customBlocks.filter((block: { type: string }) => block.type === 'drop')
  if (blocks.length === 0) {
    const opening = /<drop\b[^>]*>/i.exec(source)
    if (opening) {
      const close = source.indexOf('</drop>', opening.index + opening[0].length)
      if (close < 0) diagnostics.push(diagnostic('Unterminated <drop> block', opening.index, Math.min(source.length, opening.index + opening[0].length)))
    }
  }
  if (blocks.length > 1) diagnostics.push(diagnostic('A component can contain only one <drop> block', blocks[1].loc.start.offset, blocks[blocks.length - 1].loc.end.offset))
  const raw = blocks[0]
  if (!raw) return { filename, source, block: null, diagnostics }

  const contentStart = raw.loc.start.offset
  const contentEnd = raw.loc.end.offset
  const opening = findOpeningTag(source, contentStart)
  const openingTagStart = opening.start
  const openingTagEnd = opening.end
  const closingTagStart = source.indexOf('</drop>', contentEnd)
  const closingTag = closingTagStart >= 0 ? closingTagStart : contentEnd
  const block: DropBlockRange = {
    openingTagStart,
    openingTagEnd,
    contentStart,
    contentEnd,
    closingTagStart: closingTag,
    closingTagEnd: Math.min(source.length, closingTag + '</drop>'.length),
    language: raw.lang || 'js',
    content: raw.content,
  }
  if (openingTagStart < 0 || openingTagEnd <= openingTagStart) {
    diagnostics.push(diagnostic('Malformed <drop> opening tag', Math.max(0, contentStart), Math.min(source.length, contentStart + 1)))
  }
  if (closingTagStart < 0) {
    diagnostics.push(diagnostic('Unterminated <drop> block', Math.max(0, openingTagStart), Math.min(source.length, openingTagEnd)))
  }
  if (block.language !== 'js' && block.language !== 'ts') {
    diagnostics.push(diagnostic(`Unsupported <drop> language "${block.language}"; expected "js" or "ts"`, Math.max(0, openingTagStart), Math.min(source.length, openingTagEnd)))
  }
  return { filename, source, block, diagnostics }
}
