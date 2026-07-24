import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import fg from 'fast-glob'
import { build } from 'vite'
import { compileDropBehavior } from './drop-vite-plugin'
import { parseDropSfc } from './parse-drop-sfc'

interface BuildDropsOptions {
  buildDir: string
  runtimeDir: string
  srcDir: string
}

export async function buildDrops({ buildDir, runtimeDir, srcDir }: BuildDropsOptions): Promise<void> {
  const files = await fg(['components/**/*.vue', 'app/components/**/*.vue'], {
    cwd: srcDir,
    absolute: true,
  })
  const entryDir = join(buildDir, 'drop-entries')
  const outputDir = join(buildDir, 'drop')
  const entries: Record<string, string> = {}

  await mkdir(entryDir, { recursive: true })

  for (const filename of files) {
    const parsed = parseDropSfc(filename, await readFile(filename, 'utf8'))
    if (!parsed) {
      continue
    }

    const entry = join(entryDir, `${parsed.behavior.id}.ts`)
    await writeFile(entry, `
import behavior from ${JSON.stringify(`./${parsed.behavior.id}.behavior.ts`)}
import { mountDropBehavior } from '#drop/runtime'

mountDropBehavior(${JSON.stringify(parsed.behavior.id)}, behavior)
`)
    await writeFile(join(entryDir, `${parsed.behavior.id}.behavior.ts`), compileDropBehavior(parsed.behavior))
    entries[parsed.behavior.id] = entry
  }

  if (Object.keys(entries).length === 0) {
    return
  }

  await build({
    configFile: false,
    resolve: {
      alias: {
        '#drop/runtime': join(runtimeDir, 'client.ts'),
        '#drop/state': join(runtimeDir, 'store.ts'),
        '#drop/reactivity': join(runtimeDir, 'reactivity.ts'),
        '~': srcDir,
        '@': srcDir,
      },
    },
    build: {
      emptyOutDir: true,
      outDir: outputDir,
      rollupOptions: {
        input: entries,
        output: {
          entryFileNames: '[name].js',
        },
      },
    },
  })
}
