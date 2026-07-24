import type { ParsedDropDocument, DropDiagnostic } from './types'

// Keep this in sync with the build-time Drop transform. The import itself (rather
// than the whole statement) is highlighted so editors can offer a useful fix.
const forbiddenModules = /^(?:vue|#app|#imports|nuxt(?:\/.*)?)$/

function maskComments(source: string): string {
  return source.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, comment => comment.replace(/[^\n]/g, ' '))
}

export function getDropDiagnostics(parsed: ParsedDropDocument): DropDiagnostic[] {
  const block = parsed.block
  if (!block) return []
  const diagnostics: DropDiagnostic[] = []
  const scanContent = maskComments(block.content)
  let lineOffset = 0
  for (const line of scanContent.split('\n')) {
    const fromImport = /\bfrom[ \t]*(["'])([^"']+)\1/.exec(line)
    const sideEffectImport = /^[ \t]*import[ \t]*(["'])([^"']+)\1/.exec(line)
    const matches = fromImport && sideEffectImport && sideEffectImport.index < fromImport.index
      ? [sideEffectImport]
      : fromImport ? [fromImport] : sideEffectImport ? [sideEffectImport] : []
    for (const match of matches) {
      const moduleName = match[2]
      const quote = match[1]
      if (!moduleName || !quote || !forbiddenModules.test(moduleName)) continue
      const quoteOffset = match.index + match[0].indexOf(quote)
      const start = block.contentStart + lineOffset + quoteOffset
      diagnostics.push({
        message: `<drop> cannot import "${moduleName}"`,
        start,
        end: start + moduleName.length + 2,
        severity: 'error',
      })
    }
    lineOffset += line.length + 1
  }
  return diagnostics
}
