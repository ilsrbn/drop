import { readFile } from 'node:fs/promises'
import fg from 'fast-glob'
import type { Plugin } from 'vite'
import { parseDropSfc, type DropBehaviorSource } from './parse-drop-sfc'

const vueFilePattern = /\.vue$/
const behaviorPrefix = '\0drop:behavior:'
const entryPrefix = '\0drop:entry:'

export function createDropSfcTransformPlugin(): Plugin {
  return {
    name: 'drop:sfc-transform',
    enforce: 'pre',
    transform(source, id) {
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
    },
  }
}

export function createDropEntryPlugin(srcDir: string): Plugin {
  const behaviors = new Map<string, DropBehaviorSource>()

  return {
    name: 'drop:entry-build',
    apply: 'build',
    async buildStart() {
      const files = await fg(['components/**/*.vue', 'app/components/**/*.vue'], {
        cwd: srcDir,
        absolute: true,
      })

      for (const filename of files) {
        const parsed = parseDropSfc(filename, await readFile(filename, 'utf8'))
        if (!parsed) {
          continue
        }

        behaviors.set(parsed.behavior.id, parsed.behavior)
        this.emitFile({
          type: 'chunk',
          id: `${entryPrefix}${parsed.behavior.id}`,
          fileName: `drop/${parsed.behavior.id}.js`,
        })
      }
    },
    resolveId(id) {
      if (id.startsWith(behaviorPrefix) || id.startsWith(entryPrefix)) {
        return id
      }

      return null
    },
    load(id) {
      if (id.startsWith(behaviorPrefix)) {
        const behavior = behaviors.get(id.slice(behaviorPrefix.length))
        return behavior ? compileDropBehavior(behavior) : null
      }

      if (id.startsWith(entryPrefix)) {
        const behaviorId = id.slice(entryPrefix.length)
        return `
import behavior from ${JSON.stringify(`${behaviorPrefix}${behaviorId}`)}
import { mountDropBehavior } from '#drop/runtime'

mountDropBehavior(${JSON.stringify(behaviorId)}, behavior)
`
      }

      return null
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

export function compileDropBehavior(behavior: DropBehaviorSource): string {
  const imports = behavior.code.match(/^\s*import[^\n]+(?:\n|$)/gm) ?? []
  const body = behavior.code.replace(/^\s*import[^\n]+(?:\n|$)/gm, '')

  return `${imports.join('')}\nexport default function dropBehavior(context) {
  const useDropContext = () => context
${body}
}
`
}
