import { basename, relative, isAbsolute } from 'node:path'
import { createHash } from 'node:crypto'
import type { ParsedDropDocument, SourceMapping } from './types'

export interface DropVirtualDocument {
  fileName: string
  language: string
  text: string
  mappings: SourceMapping[]
  toSourceOffset(offset: number): number | undefined
  toVirtualOffset(offset: number): number | undefined
}

const AMBIENT = `declare function useDropContext<T = Record<string, unknown>>(): T\n`

export function createDropVirtualDocument(parsed: ParsedDropDocument, options: { workspaceRoot?: string, projectRoot?: string } = {}): DropVirtualDocument {
  const block = parsed.block
  const language = block?.language || 'js'
  const root = options.workspaceRoot || options.projectRoot
  const normalizedFilename = parsed.filename.replaceAll('\\', '/')
  const hashedBase = `${basename(parsed.filename)}--${createHash('sha1').update(normalizedFilename).digest('hex').slice(0, 8)}`
  let stableName = root && isAbsolute(parsed.filename) ? relative(root, parsed.filename).replaceAll('\\', '/') : hashedBase
  if (stableName.startsWith('../') || isAbsolute(stableName)) stableName = hashedBase
  const fileName = `${stableName}.drop.${language}`
  if (!block) {
    return { fileName, language, text: AMBIENT, mappings: [], toSourceOffset: () => undefined, toVirtualOffset: () => undefined }
  }
  const linePadding = '\n'.repeat(Math.max(0, (parsed.source.slice(0, block.contentStart).match(/\n/g) || []).length - 1))
  const prefix = AMBIENT + linePadding
  const text = prefix + block.content
  const mapping: SourceMapping = { sourceStart: block.contentStart, sourceEnd: block.contentEnd, generatedStart: prefix.length, generatedEnd: text.length }
  const toSourceOffset = (offset: number) => offset >= mapping.generatedStart && offset <= mapping.generatedEnd ? mapping.sourceStart + offset - mapping.generatedStart : undefined
  const toVirtualOffset = (offset: number) => offset >= mapping.sourceStart && offset <= mapping.sourceEnd ? mapping.generatedStart + offset - mapping.sourceStart : undefined
  return { fileName, language, text, mappings: [mapping], toSourceOffset, toVirtualOffset }
}
