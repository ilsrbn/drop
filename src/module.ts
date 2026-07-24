import { addImports, addTypeTemplate, addVitePlugin, createResolver, defineNuxtModule } from '@nuxt/kit'
import { buildDrops } from './build/build-drops'
import { createDropSfcTransformPlugin } from './build/drop-vite-plugin'

export interface ModuleOptions {
  enabled?: boolean
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'drop',
    configKey: 'drop',
  },
  defaults: {
    enabled: true,
  },
  setup(_options, nuxt) {
    const resolver = createResolver(import.meta.url)

    nuxt.options.alias['#drop/context'] = resolver.resolve('./runtime/context')
    nuxt.options.alias['#drop/state'] = resolver.resolve('./runtime/store')
    nuxt.options.alias['#drop/reactivity'] = resolver.resolve('./runtime/reactivity')
    nuxt.options.alias['#drop/runtime'] = resolver.resolve('./runtime/client')
    nuxt.options.alias['#drop/server'] = resolver.resolve('./runtime/server')

    addImports({
      name: 'defineDropState',
      from: resolver.resolve('./runtime/server'),
    })

    addTypeTemplate({
      filename: 'types/drop.d.ts',
      getContents: () => `
declare function defineDropState(state: Record<string, unknown>): void

export {}
`,
    })

    addVitePlugin(createDropSfcTransformPlugin())

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
      await buildDrops({
        buildDir: nuxt.options.buildDir,
        rootDir: nuxt.options.rootDir,
        runtimeDir: resolver.resolve('./runtime'),
        srcDir: nuxt.options.srcDir,
      })
    })
  },
})
