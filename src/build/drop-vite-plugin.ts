import type { Plugin } from 'vite'
import { parseDropSfc } from './parse-drop-sfc'

const vueFilePattern = /\.vue$/

export function createDropSfcTransformPlugin(): Plugin {
  return {
    name: 'drop:sfc-transform',
    enforce: 'pre',
    transform(source, id) {
      return transformDropSfc(source, id)
    },
  }
}

export function transformDropSfc(source: string, id: string) {
  if (!vueFilePattern.test(id)) {
    return null
  }

  const parsed = parseDropSfc(id, source)
  if (!parsed) {
    return null
  }

  return {
    code: parsed.vueSource,
    map: null,
  }
}
