import type { ParsedDropDocument, DropDiagnostic } from './types'

// Keep this in sync with the build-time Drop transform. The import itself (rather
// than the whole statement) is highlighted so editors can offer a useful fix.
const forbiddenImportPattern = /^(\s*import\s+(?:(?:[\w$*{},\s]+?)\s+from\s*)?)(["'])(vue|#app|#imports|nuxt(?:\/[^"']*)?)\2/gm

function maskComments(source: string): string {
  return source.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, comment => comment.replace(/[^\n]/g, ' '))
}

export function getDropDiagnostics(parsed: ParsedDropDocument): DropDiagnostic[] {
  const block = parsed.block
  if (!block) return []
  const diagnostics: DropDiagnostic[] = []
  forbiddenImportPattern.lastIndex = 0
  let match: RegExpExecArray | null
  const scanContent = maskComments(block.content)
  while ((match = forbiddenImportPattern.exec(scanContent))) {
    const start = block.contentStart + match.index + match[1]!.length
    diagnostics.push({
      message: `<drop> cannot import "${match[3]}"`,
      start,
      end: start + match[3]!.length + 2,
      severity: 'error',
    })
  }
  return diagnostics
}
