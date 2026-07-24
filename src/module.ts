import { defineNuxtModule } from '@nuxt/kit'

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
  setup() {
  },
})
