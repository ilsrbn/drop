import { describe, expect, it } from 'vitest'
import { parseDropSfc } from '../../src/build/parse-drop-sfc'

const validSource = `
<template>
  <header><span>Drop</span></header>
</template>

<script setup lang="ts">
defineDrop({ state: { user: null } }, (ctx) => {
  ctx.root.classList.add('ready')
})
</script>
`

describe('parseDropSfc', () => {
  it('extracts a defineDrop callback and removes it from the Vue SFC source', () => {
    const result = parseDropSfc('app/components/UserHeader.vue', validSource)

    expect(result?.behavior.id).toMatch(/^UserHeader--/)
    expect(result?.behavior.code).toContain('ctx.root.classList.add(\'ready\')')
    expect(result?.vueSource).not.toContain('defineDrop(')
    expect(result?.vueSource).toContain('data-drop-root="UserHeader--')
    expect(result?.vueSource).toContain('const __drop = createDropState(useHead, "UserHeader--')
    expect(result?.vueSource).toContain(':data-drop-state="__drop.serialized"')
  })

  it('rejects multiple defineDrop calls', () => {
    const source = validSource.replace('</script>', '\ndefineDrop({ state: {} }, (ctx) => {})\n</script>')

    expect(() => parseDropSfc('Bad.vue', source)).toThrow(/only one defineDrop/)
  })

  it('rejects a template fragment', () => {
    const source = validSource.replace(
      '<header><span>Drop</span></header>',
      '<header />\n  <main />',
    )

    expect(() => parseDropSfc('Bad.vue', source)).toThrow(/one HTML root element/)
  })

  it('rejects a callback that captures surrounding SFC declarations', () => {
    const source = validSource.replace(
      'defineDrop({ state: { user: null } }, (ctx) => {',
      'const selector = \' .ready\'\ndefineDrop({ state: { user: null } }, (ctx) => {\n  ctx.root.matches(selector)',
    )

    expect(() => parseDropSfc('Bad.vue', source)).toThrow(/cannot capture "selector"/)
  })

  it('allows a state property with the same name as its SSR declaration', () => {
    const source = validSource.replace(
      'defineDrop({ state: { user: null } }, (ctx) => {',
      'const imageSources = []\ndefineDrop({ state: { imageSources } }, (ctx) => {\n  ctx.state.imageSources',
    )

    expect(parseDropSfc('Widget.vue', source)).not.toBeNull()
  })

  it('requires ctx.load to receive a string literal', () => {
    const source = validSource.replace(
      'ctx.root.classList.add(\'ready\')',
      'const moduleName = \'lenis\'\n  ctx.load(moduleName)',
    )

    expect(() => parseDropSfc('Bad.vue', source)).toThrow(/ctx\.load requires a string-literal module specifier/)
  })

  it('derives distinct behavior IDs for same-named components in different paths', () => {
    const srcDir = '/project/app'
    const header = parseDropSfc('/project/app/components/UserHeader.vue', validSource, srcDir)
    const widget = parseDropSfc('/project/app/widgets/header/UserHeader.vue', validSource, srcDir)

    expect(header?.behavior.id).not.toBe(widget?.behavior.id)
  })
})
