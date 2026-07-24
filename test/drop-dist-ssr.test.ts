import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { $fetch, setup } from '@nuxt/test-utils/e2e'

const distWidgetId = 'DistWidget--Y29tcG9uZW50cy9EaXN0V2lkZ2V0LnZ1ZQ'

describe('Drop distribution build', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/drop-dist', import.meta.url)),
  })

  it('builds and serves a behavior through the packaged module', async () => {
    const html = await $fetch<string>('/')
    const source = await $fetch<string>(`/_drop/${distWidgetId}.js`)

    expect(html).toContain(`data-drop-root="${distWidgetId}"`)
    expect(source).toContain(distWidgetId)
  })
})
