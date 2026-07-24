import { describe, expect, it } from 'vitest'
import { parseDropDocument } from '../src/parse'
import { createDropTypeScriptService } from '../src/typescript-service'

const parse = (content: string, filename = '/project/src/Widget.vue') => parseDropDocument(`<script setup lang="ts">defineDropState({})</script><drop lang="ts">${content}</drop>`, filename)

describe('Drop TypeScript service', () => {
  it('reports forbidden imports at their original SFC ranges', () => {
    const parsed = parse('import x from "vue"\nimport y from "#app"\nimport z from "#imports"\nimport n from "nuxt/config"')
    const service = createDropTypeScriptService(parsed)
    const diagnostics = service.getDropDiagnostics()
    expect(diagnostics.filter(d => d.message.includes('cannot import'))).toHaveLength(4)
    expect(diagnostics[0].start).toBe(parsed.block!.contentStart + parsed.block!.content.indexOf('"vue"'))
  })

  it('maps unknown identifier diagnostics to the SFC', () => {
    const parsed = parse('const value = definitelyMissing')
    const diagnostics = createDropTypeScriptService(parsed).getDropDiagnostics()
    expect(diagnostics.some(d => d.message.includes('Cannot find name'))).toBe(true)
    const unknown = diagnostics.find(d => d.message.includes('Cannot find name'))!
    expect(parsed.source.slice(unknown.start, unknown.end)).toBe('definitelyMissing')
  })

  it('offers completion after state.', () => {
    const parsed = parse('const state = { count: 1 }\nstate.')
    const service = createDropTypeScriptService(parsed)
    const position = parsed.block!.contentStart + parsed.block!.content.lastIndexOf('state.') + 'state.'.length
    expect(service.getCompletionsAtPosition(position)?.items.some(item => item.name === 'count')).toBe(true)
  })

  it('maps definitions from project files back to source coordinates', () => {
    const parsed = parse('import { answer } from "./answer"\nanswer')
    const service = createDropTypeScriptService(parsed, {
      files: { '/project/src/answer.ts': 'export const answer = 42' },
    })
    const position = parsed.block!.contentStart + parsed.block!.content.lastIndexOf('answer')
    const definitions = service.getDefinitionAtPosition(position)
    expect(definitions?.some(d => d.fileName === '/project/src/answer.ts')).toBe(true)
    expect(definitions?.[0]?.textSpan.start).toBeGreaterThanOrEqual(0)
  })

  it('maps local Drop definitions back to the original SFC range', () => {
    const parsed = parse('const answer = 42\nanswer')
    const service = createDropTypeScriptService(parsed)
    const reference = parsed.block!.contentStart + parsed.block!.content.lastIndexOf('answer')
    const definition = service.getDefinitionAtPosition(reference)?.[0]
    expect(definition?.fileName).toBe(parsed.filename)
    expect(definition?.textSpan.start).toBe(parsed.block!.contentStart + parsed.block!.content.indexOf('answer'))
  })

  it('includes parser diagnostics in the service diagnostics', () => {
    const parsed = parseDropDocument('<drop lang="wat">value</drop>', '/project/src/Widget.vue')
    const diagnostics = createDropTypeScriptService(parsed).getDropDiagnostics()
    expect(diagnostics.some(d => d.message.includes('Unsupported <drop> language'))).toBe(true)
  })

  it('does not report forbidden imports in comments or strings', () => {
    const parsed = parse('/*\nimport "vue"\n*/\nconst text = "import \'#app\'"; const x = "; import \'nuxt/config\'"')
    expect(createDropTypeScriptService(parsed).getDropDiagnostics().some(d => d.message.includes('cannot import'))).toBe(false)
  })

  it('highlights the module name in a default import', () => {
    const parsed = parse('import value from "vue"')
    const diagnostic = createDropTypeScriptService(parsed).getDropDiagnostics().find(d => d.message.includes('cannot import'))!
    expect(parsed.source.slice(diagnostic.start, diagnostic.end)).toBe('"vue"')
  })

  it('omits definitions that only exist in the virtual helper prefix', () => {
    const parsed = parse('useDropContext()')
    const service = createDropTypeScriptService(parsed)
    const position = parsed.block!.contentStart + parsed.block!.content.indexOf('useDropContext')
    expect(service.getDefinitionAtPosition(position)?.some(d => d.fileName === parsed.filename)).toBe(false)
  })
})
