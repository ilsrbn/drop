import { describe, expect, it, vi } from 'vitest'
import { transformDropSfc } from '../../src/build/drop-vite-plugin'

const source = `
<template><header>Drop</header></template>
<script setup lang="ts">defineDropState({ user: null })</script>
<drop lang="ts">const { root } = useDropContext()</drop>
`

describe('Drop Vite transform', () => {
  it('removes a Drop block before Vue compiles the SFC', () => {
    const result = transformDropSfc(source, '/app/components/UserHeader.vue')

    expect(result).toMatchObject({
      code: expect.not.stringContaining('<drop'),
    })
  })

  it('leaves ordinary Vue SFCs unchanged', () => {
    const result = transformDropSfc('<template><main /></template>', '/app/App.vue')

    expect(result).toBeNull()
  })

  it('rebuilds Drop behaviors and reloads the page on a hot update', async () => {
    const rebuild = vi.fn()
    const reload = vi.fn()
    const { createDropSfcTransformPlugin } = await import('../../src/build/drop-vite-plugin')
    const plugin = createDropSfcTransformPlugin('/app', rebuild)

    if (typeof plugin.handleHotUpdate !== 'function') {
      throw new Error('Drop plugin must handle hot updates')
    }

    await plugin.handleHotUpdate.call({} as never, {
      file: '/app/components/UserHeader.vue',
      read: async () => source,
      server: { ws: { send: reload } },
    } as never)

    expect(rebuild).toHaveBeenCalledOnce()
    expect(reload).toHaveBeenCalledWith({ type: 'full-reload' })
  })
})
