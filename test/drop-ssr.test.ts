import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { $fetch, setup } from '@nuxt/test-utils/e2e'

describe('Drop SSR bridge', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/drop', import.meta.url)),
  })

  it('renders a Drop root and its JSON state without the Nuxt client entry', async () => {
    const html = await $fetch<string>('/')

    expect(html).toContain('data-drop-root="UserHeader"')
    expect(html).toContain('data-drop-state="{&quot;user&quot;:null}"')
    expect(html).toMatch(/<script[^>]+src="\/_drop\/UserHeader\.js"[^>]+type="module"/)
    expect(html).not.toMatch(/_nuxt\/.*entry/)
  })

  it('serves a behavior entry that mounts the component', async () => {
    const source = await $fetch<string>('/_drop/UserHeader.js')

    expect(source).toContain('UserHeader')
  })
})
