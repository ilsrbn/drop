import type { Plugin } from 'vite'
import { parseDropSfc, type DropBehaviorSource } from './parse-drop-sfc'

const vueFilePattern = /\.vue$/

export function createDropSfcTransformPlugin(
  srcDir?: string,
  onDropSfcChange?: () => Promise<void> | void,
): Plugin {
  return {
    name: 'drop:sfc-transform',
    enforce: 'pre',
    transform(source, id) {
      if (!vueFilePattern.test(id)) {
        return null
      }

      const parsed = parseDropSfc(id, source, srcDir)
      if (!parsed) {
        return null
      }

      return {
        code: parsed.vueSource,
        map: null,
      }
    },
    async handleHotUpdate({ file, read, server }) {
      if (!vueFilePattern.test(file) || !parseDropSfc(file, await read(), srcDir)) {
        return
      }

      await onDropSfcChange?.()
      server.ws.send({ type: 'full-reload' })
    },
  }
}

export function transformDropSfc(source: string, id: string, srcDir?: string) {
  if (!vueFilePattern.test(id)) {
    return null
  }

  const parsed = parseDropSfc(id, source, srcDir)
  if (!parsed) {
    return null
  }

  return {
    code: parsed.vueSource,
    map: null,
  }
}

export function compileDropBehavior(behavior: DropBehaviorSource): string {
  const imports = behavior.code.match(/^\s*import[^\n]+(?:\n|$)/gm) ?? []
  const body = behavior.code.replace(/^\s*import[^\n]+(?:\n|$)/gm, '')

  return `${imports.join('')}\nexport default function dropBehavior(context) {
  const useDropContext = () => context
${body}
}
`
}
