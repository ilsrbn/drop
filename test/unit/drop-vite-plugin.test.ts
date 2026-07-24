import { describe, expect, it } from 'vitest'
import { transformDropSfc } from '../../src/build/drop-vite-plugin'

const source = `
<template><header>Drop</header></template>
<script setup lang="ts">defineDropState({ user: null })</script>
<drop lang="ts">const { root } = useDropContext()</drop>
`

describe('Drop Vite transform', () => {
  it('removes a Drop custom block before Vue compiles the SFC', () => {
    const result = transformDropSfc(source, '/app/components/UserHeader.vue')

    expect(result).toMatchObject({
      code: expect.not.stringContaining('<drop'),
    })
  })

  it('leaves ordinary Vue SFCs unchanged', () => {
    const result = transformDropSfc('<template><main /></template>', '/app/App.vue')

    expect(result).toBeNull()
  })
})
