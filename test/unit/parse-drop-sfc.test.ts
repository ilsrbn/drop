import { describe, expect, it } from 'vitest'
import { parseDropSfc } from '../../src/build/parse-drop-sfc'

const validSource = `
<template>
  <header><span>Drop</span></header>
</template>

<script setup lang="ts">
defineDropState({ user: null })
</script>

<drop lang="ts">
const { root } = useDropContext()
</drop>
`

describe('parseDropSfc', () => {
  it('extracts one Drop block and removes it from the Vue SFC source', () => {
    const result = parseDropSfc('app/components/UserHeader.vue', validSource)

    expect(result?.behavior.id).toBe('UserHeader')
    expect(result?.behavior.code).toContain('useDropContext')
    expect(result?.vueSource).not.toContain('<drop')
    expect(result?.vueSource).toContain('data-drop-root="UserHeader"')
    expect(result?.vueSource).toContain('const __drop = createDropState(useHead, "UserHeader",')
    expect(result?.vueSource).toContain(':data-drop-state="__drop.serialized"')
  })

  it('rejects multiple Drop blocks', () => {
    const source = `${validSource}\n<drop>const two = true</drop>`

    expect(() => parseDropSfc('Bad.vue', source)).toThrow(/only one <drop>/)
  })

  it('rejects a template fragment', () => {
    const source = validSource.replace(
      '<header><span>Drop</span></header>',
      '<header />\n  <main />',
    )

    expect(() => parseDropSfc('Bad.vue', source)).toThrow(/one HTML root element/)
  })

  it('rejects Drop imports from Nuxt client modules', () => {
    const source = validSource.replace(
      'const { root } = useDropContext()',
      'import { useNuxtApp } from "#app"',
    )

    expect(() => parseDropSfc('Bad.vue', source)).toThrow(/cannot import "#app"/)
  })

  it('rejects defineDropState without a Drop block', () => {
    const source = validSource.replace(/<drop[\s\S]*?<\/drop>/, '')

    expect(() => parseDropSfc('Bad.vue', source)).toThrow(/defineDropState requires a <drop>/)
  })
})
