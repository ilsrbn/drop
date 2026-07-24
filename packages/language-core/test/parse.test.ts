import { describe, expect, it } from 'vitest'
import { parseDropDocument } from '../src/parse'

const base = (block = '') => `<script setup lang="ts">defineDropState({})</script><template><div /></template>${block}`

describe('parseDropDocument', () => {
  it('returns no block', () => expect(parseDropDocument(base(), 'x.vue').block).toBeNull())
  it('returns exact block offsets', () => {
    const source = base('<drop lang="ts">\nconst x = 1\n</drop>')
    const result = parseDropDocument(source, 'x.vue')
    expect(result.block?.language).toBe('ts')
    expect(source.slice(result.block!.openingTagStart, result.block!.openingTagEnd)).toBe('<drop lang="ts">')
    expect(source.slice(result.block!.contentStart, result.block!.contentEnd)).toBe('\nconst x = 1\n')
    expect(source.slice(result.block!.closingTagStart, result.block!.closingTagEnd)).toBe('</drop>')
  })
  it('diagnoses duplicate and missing lang', () => {
    const result = parseDropDocument(base('<drop>one</drop><drop lang="ts">two</drop>'), 'x.vue')
    expect(result.diagnostics.map(d => d.message)).toContain('A component can contain only one <drop> block')
    expect(parseDropDocument(base('<drop>one</drop>'), 'x.vue').block?.language).toBe('js')
  })
  it('returns malformed Vue diagnostics', () => expect(parseDropDocument('<template>', 'x.vue')).toMatchObject({ block: null, diagnostics: expect.any(Array) }))
  it('rejects unsupported language and clamps ranges', () => {
    const source = '<drop lang="jsx">x</drop>'
    const result = parseDropDocument(source, 'x.vue')
    expect(result.diagnostics.some(d => d.message.includes('Unsupported'))).toBe(true)
    expect(result.diagnostics.every(d => d.end <= source.length)).toBe(true)
  })
  it('clamps unterminated closing range to source length', () => {
    const source = '<drop lang="ts">value'
    const result = parseDropDocument(source, 'x.vue')
    expect(result.block).not.toBeNull()
    expect(result.block!.closingTagEnd).toBeLessThanOrEqual(source.length)
    expect(result.diagnostics.some(d => d.message.includes('Unterminated'))).toBe(true)
  })
  it('finds opening tag end after quoted greater-than attributes', () => {
    const source = '<drop data-x=">" lang="ts">\nconst x = 1\n</drop>'
    const result = parseDropDocument(source, 'x.vue')
    expect(source.slice(result.block!.openingTagStart, result.block!.openingTagEnd)).toBe('<drop data-x=">" lang="ts">')
  })
})
