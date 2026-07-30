import { describe, expect, it, vi } from 'vitest'
import { compileDropBehavior, transformDropSfc } from '../../src/build/drop-vite-plugin'

const source = `
<template><header>Drop</header></template>
<script setup lang="ts">defineDrop({ state: { user: null } }, (ctx) => { ctx.root.hidden = false })</script>
`

describe('Drop Vite transform', () => {
  it('removes a defineDrop call before Vue compiles the SFC', () => {
    const result = transformDropSfc(source, '/app/components/UserHeader.vue')

    expect(result).toMatchObject({
      code: expect.not.stringContaining('defineDrop('),
    })
  })

  it('leaves ordinary Vue SFCs unchanged', () => {
    const result = transformDropSfc('<template><main /></template>', '/app/App.vue')

    expect(result).toBeNull()
  })

  it('injects only used signal helpers and compiles ctx.load to a dynamic import', () => {
    const behavior = compileDropBehavior({
      code: 'const open = ctx.signal(false)\nctx.effect(() => open())\nawait ctx.load(\'lenis\')',
      filename: 'Widget.vue',
      id: 'Widget',
      lang: 'ts',
    })

    expect(behavior).toContain('import { signal, effect as alienEffect } from \'#drop/reactivity\'')
    expect(behavior).toContain('await import(\'lenis\')')
    expect(behavior).toContain('context.onCleanup(stop)')
    expect(behavior).not.toContain('computed,')
  })

  it('rebuilds Drop behaviors and reloads the page on a hot update', async () => {
    const rebuild = vi.fn()
    const reload = vi.fn()
    const { createDropSfcTransformPlugin } = await import('../../src/build/drop-vite-plugin')
    const plugin = createDropSfcTransformPlugin('/app', rebuild)

    if (typeof plugin.handleHotUpdate !== 'function') {
      throw new TypeError('Drop plugin must handle hot updates')
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
