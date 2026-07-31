import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { addImports, addTypeTemplate, addVitePlugin, createResolver, defineNuxtModule } from '@nuxt/kit'

export default defineNuxtModule({
  meta: {
    name: 'drop',
    version: '1.0.2',
    configKey: 'drop',
    compatibility: {
      nuxt: '^4.5.0',
    },
  },
  async setup(_options, nuxt) {
    const resolver = createResolver(import.meta.url)
    const moduleDir = dirname(fileURLToPath(import.meta.url))
    const runtimeDir = existsSync(resolve(moduleDir, 'runtime'))
      ? resolve(moduleDir, 'runtime')
      : resolve(moduleDir, '../runtime')

    nuxt.options.alias['#drop/context'] = resolve(runtimeDir, 'context')
    nuxt.options.alias['#drop/state'] = resolve(runtimeDir, 'store')
    nuxt.options.alias['#drop/reactivity'] = resolve(runtimeDir, 'reactivity')
    nuxt.options.alias['#drop/runtime'] = resolve(runtimeDir, 'client')
    nuxt.options.alias['#drop/server'] = resolve(runtimeDir, 'server')

    addImports({ name: 'defineDrop', from: resolve(runtimeDir, 'server') })

    addTypeTemplate({
      filename: 'types/drop.d.ts',
      getContents: () => `
declare global {
  function defineDrop<TState extends Record<string, unknown>>(
    options: { state: TState },
    behavior: (ctx: import(${JSON.stringify(resolve(runtimeDir, 'types'))}).DropContext<import('vue').UnwrapRef<TState>>) => void | (() => void) | Promise<void | (() => void)>,
  ): void
}

export {}
`,
    })

    const rebuildDrops = async () => {
      const { buildDrops } = await import('./build/build-drops')
      await buildDrops({
        buildDir: nuxt.options.buildDir,
        rootDir: nuxt.options.rootDir,
        runtimeDir,
        srcDir: nuxt.options.srcDir,
      })
    }

    const { createDropSfcTransformPlugin } = await import('./build/drop-vite-plugin')
    addVitePlugin(createDropSfcTransformPlugin(nuxt.options.srcDir, rebuildDrops))

    nuxt.hook('nitro:config', (config) => {
      config.publicAssets ||= []
      config.publicAssets.push({
        baseURL: '/_drop',
        dir: resolver.resolve(nuxt.options.buildDir, 'drop'),
        maxAge: 0,
      })
    })

    // Nuxt generates .nuxt/tsconfig.json while preparing the app. Build Drop
    // after that phase, but before Nitro copies public assets into its output.
    nuxt.hook('nitro:build:before', async () => {
      await rebuildDrops()
    })
  },
})
