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
  const usesSignal = /\bctx\.signal\b/.test(behavior.code)
  const usesComputed = /\bctx\.computed\b/.test(behavior.code)
  const usesEffect = /\bctx\.effect\b/.test(behavior.code)
  const imports = [
    usesSignal ? 'signal' : '',
    usesComputed ? 'computed' : '',
    usesEffect ? 'effect as alienEffect' : '',
  ].filter(Boolean)
  const body = behavior.code.replace(/\bctx\.load\(\s*(['"][^'"]+['"])\s*\)/g, 'import($1)')
  const helpers = [
    usesSignal ? 'signal' : '',
    usesComputed ? 'computed' : '',
    usesEffect ? 'effect: (fn) => { const stop = alienEffect(fn); context.onCleanup(stop); return stop }' : '',
  ].filter(Boolean)
  const reactivityImport = imports.length > 0
    ? `import { ${imports.join(', ')} } from '#drop/reactivity'\n`
    : ''

  return `${reactivityImport}export default async function dropBehavior(context) {
  const ctx = ${helpers.length > 0 ? `{ ...context, ${helpers.join(', ')} }` : 'context'}
${body}
}
`
}
