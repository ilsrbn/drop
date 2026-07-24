import { getDropDiagnostics, parseDropDocument, createDropVirtualDocument } from '@drop/language-core'
import type { DropDiagnostic, DropVirtualDocument } from '@drop/language-core'
import type { IR, VueCodeInformation, VueLanguagePlugin, VueLanguagePluginReturn } from '@vue/language-core'

/** Result of the Drop-specific diagnostic pass for a Vue source file. */
export interface DropVolarDiagnostics {
  diagnostics: DropDiagnostic[]
  document: DropVirtualDocument
}

/**
 * Run Drop diagnostics for a Vue document. Volar's plugin API currently has no
 * custom-diagnostics hook; language servers should merge this result with the
 * TypeScript diagnostics produced for the embedded code.
 */
export function getDropVolarDiagnostics(fileName: string, source: string): DropVolarDiagnostics {
  const parsed = parseDropDocument(source, fileName)
  return {
    diagnostics: [...parsed.diagnostics, ...getDropDiagnostics(parsed)],
    document: createDropVirtualDocument(parsed),
  }
}

const dropFeatures: VueCodeInformation = {
  verification: true,
  completion: true,
  semantic: true,
  navigation: true,
  structure: true,
  format: true,
}

function sourceContent(ir: IR): string {
  return ir.content
}

/**
 * Vue Language Tools plugin for `<drop>` custom blocks. The shared core has a
 * single-block model, so only the first Drop block is exposed; duplicate
 * blocks remain parser diagnostics and are not independently embedded.
 *
 * The plugin is additive: it only creates `drop_block_*` embedded files, so
 * Vue's regular script/template/style embedded files remain untouched.
 */
export const createDropVolarPlugin = (): VueLanguagePlugin => _context => dropVolarPlugin()

// Kept as a separate factory implementation to retain the exact Vue plugin
// signature while allowing consumers to pass it to `vueCompilerOptions.plugins`.
export function dropVolarPlugin(): VueLanguagePluginReturn {
  return {
    version: 2.2,
    name: 'drop-volar',
    getEmbeddedCodes(_fileName, ir) {
      const index = ir.customBlocks.findIndex(block => block.type === 'drop')
      if (index < 0) return []
      const block = ir.customBlocks[index]
      if (!block) return []
      return [{ id: 'drop_block_0', lang: block.lang === 'ts' ? 'ts' : 'js' }]
    },
    resolveEmbeddedCode(fileName, ir, embeddedFile) {
      if (!embeddedFile.id.startsWith('drop_block_')) return
      if (embeddedFile.id !== 'drop_block_0') return
      const index = ir.customBlocks.findIndex(block => block.type === 'drop')
      if (index < 0) return
      const parsed = parseDropDocument(sourceContent(ir), fileName)
      const virtual = createDropVirtualDocument(parsed)
      const block = ir.customBlocks[index]
      const mapping = virtual.mappings[0]
      if (!parsed.block || !block || block.type !== 'drop' || !mapping) return
      // Keep the generated ambient declaration and line padding. Only the
      // copied Drop body is mapped; its source offset is relative to the
      // custom block and Volar adds `startTagEnd` when linking to .vue.
      const prefix = virtual.text.slice(0, mapping.generatedStart)
      const body = virtual.text.slice(mapping.generatedStart, mapping.generatedEnd)
      embeddedFile.content = [prefix, [body, block.name, 0, dropFeatures]]
    },
  }
}

/** Alias matching the naming used by other Vue language plugins. */
export const plugin = dropVolarPlugin

export default dropVolarPlugin
