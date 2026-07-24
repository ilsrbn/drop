import { describe, expect, it } from 'vitest'
import { dropVolarPlugin, getDropVolarDiagnostics } from '../src/index'
import type { IR, VueEmbeddedCode } from '@vue/language-core'

const source = `<template><div /></template>\n<script setup lang="ts">const state = { count: 1 }</script>\n<drop lang="ts">\nimport Vue from 'vue'\nuseDropContext<{ count: number }>()\n</drop>\n`

function ir(): IR {
  const start = source.indexOf('import Vue')
  const end = source.indexOf('</drop>')
  return {
    content: source,
    comments: [],
    template: undefined,
    script: undefined,
    scriptSetup: undefined,
    styles: [],
    customBlocks: [{ name: 'custom_block_0', type: 'drop', start, end, startTagEnd: source.indexOf('>', source.indexOf('<drop')) + 1, endTagStart: end, lang: 'ts', content: source.slice(start, end), attrs: {} }],
  }
}

describe('@drop/volar', () => {
  it('exposes a mapped TypeScript embedded custom block', () => {
    const embedded = dropVolarPlugin()
    const codes = embedded.getEmbeddedCodes?.('Widget.vue', ir())
    expect(codes).toEqual([{ id: 'drop_block_0', lang: 'ts' }])
    const file = { id: 'drop_block_0', lang: 'ts', content: [], linkedCodeMappings: [], embeddedCodes: [] } as unknown as VueEmbeddedCode
    embedded.resolveEmbeddedCode?.('Widget.vue', ir(), file)
    const embeddedText = file.content.map(part => typeof part === 'string' ? part : part[0]).join('')
    expect(embeddedText).toContain('declare function useDropContext')
    expect(embeddedText).toContain('useDropContext<{ count: number }>()')
    const mapped = file.content.find(part => Array.isArray(part))
    expect(mapped).toBeDefined()
    if (!mapped || typeof mapped === 'string') return
    expect(mapped[1]).toBe('custom_block_0')
    expect(mapped[2]).toBe(0)
  })

  it('exposes only the first Drop block, matching core duplicate semantics', () => {
    const base = ir()
    const document = { ...base, customBlocks: [...base.customBlocks, { ...base.customBlocks[0], name: 'custom_block_1' }] } as IR
    expect(dropVolarPlugin().getEmbeddedCodes?.('Widget.vue', document)).toEqual([{ id: 'drop_block_0', lang: 'ts' }])
  })

  it('keeps Drop diagnostics in original Vue ranges', () => {
    const result = getDropVolarDiagnostics('Widget.vue', source)
    const diagnostic = result.diagnostics.find(item => item.message.includes('cannot import'))
    expect(diagnostic?.start).toBe(source.indexOf(String.raw`'vue'`))
    expect(result.document.mappings).toHaveLength(1)
  })
})
