import { defineNuxtModule } from '@nuxt/kit'

export interface ModuleOptions {
  enabled?: boolean
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-micro-behaviors',
    configKey: 'microBehaviors',
  },
  defaults: {
    enabled: true,
  },
  setup() {
  },
})
