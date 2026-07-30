export default defineNuxtConfig({
  modules: ['drop'],
  devtools: { enabled: true },
  routeRules: {
    '/': { noScripts: true },
    '/test': { noScripts: true },
  },
  compatibilityDate: 'latest',
  drop: {},
})
