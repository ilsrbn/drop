export default defineNuxtConfig({
  modules: ['drop'],
  devtools: { enabled: true },
  compatibilityDate: 'latest',
  drop: {},
  routeRules: {
    '/': { noScripts: true },
  },
})
