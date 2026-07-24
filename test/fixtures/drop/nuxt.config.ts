import Drop from '../../../src/module'

export default defineNuxtConfig({
  modules: [Drop],
  routeRules: {
    '/': { noScripts: true },
  },
})
