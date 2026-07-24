import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { $fetch, setup } from '@nuxt/test-utils/e2e'

const componentHeaderId = 'UserHeader--Y29tcG9uZW50cy9Vc2VySGVhZGVyLnZ1ZQ'
const widgetHeaderId = 'UserHeader--d2lkZ2V0cy9Vc2VySGVhZGVyLnZ1ZQ'
const widgetProbeId = 'WidgetProbe--d2lkZ2V0cy9XaWRnZXRQcm9iZS52dWU'

describe('Drop SSR bridge', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/drop', import.meta.url)),
  })

  it('renders a Drop root and its JSON state without the Nuxt client entry', async () => {
    const html = await $fetch<string>('/')

    expect(html).toContain(`data-drop-root="${componentHeaderId}"`)
    expect(html).toContain(`data-drop-root="${widgetHeaderId}"`)
    expect(html).toContain('data-drop-state="{&quot;user&quot;:null}"')
    expect(html).toContain(`/_drop/${componentHeaderId}.js`)
    expect(html).toContain(`/_drop/${widgetHeaderId}.js`)
    expect(html).not.toMatch(/_nuxt\/.*entry/)
  })

  it('serves a behavior entry that mounts the component', async () => {
    const source = await $fetch<string>(`/_drop/${componentHeaderId}.js`)

    expect(source).toContain('UserHeader')
  })

  it('serves independent behaviors for components with the same basename', async () => {
    const source = await $fetch<string>(`/_drop/${widgetHeaderId}.js`)

    expect(source).toContain(widgetHeaderId)
  })

  it('serves a behavior entry declared in an app widget', async () => {
    const source = await $fetch<string>(`/_drop/${widgetProbeId}.js`)

    expect(source).toContain('WidgetProbe')
  })
})
