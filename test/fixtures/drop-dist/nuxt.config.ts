import Drop from '../../../dist/module.mjs'

export default defineNuxtConfig({
  modules: [Drop],
  routeRules: {
    '/': { noScripts: true },
  },
})
