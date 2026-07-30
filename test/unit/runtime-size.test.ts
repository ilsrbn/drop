import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { build } from 'vite'
import { describe, expect, it } from 'vitest'

const runtimeEntry = resolve('src/runtime/client.ts')
const reactivityEntry = resolve('test/fixtures/runtime-size/signal-effect.ts')
const maxCoreGzipBytes = 5 * 1024
const maxReactivityGzipBytes = 2 * 1024

describe('Drop runtime size', () => {
  it('keeps the production core runtime at or below 5 kB gzip', async () => {
    const gzipBytes = await gzipBundle(runtimeEntry, 'drop-runtime')

    expect(gzipBytes, `core runtime is ${gzipBytes} B gzip`).toBeLessThanOrEqual(maxCoreGzipBytes)
  })

  it('keeps a signal-and-effect Drop entry at or below 2 kB gzip', async () => {
    const gzipBytes = await gzipBundle(reactivityEntry, 'drop-reactivity')

    expect(gzipBytes, `signal-and-effect entry is ${gzipBytes} B gzip`).toBeLessThanOrEqual(maxReactivityGzipBytes)
  })
})

async function gzipBundle(entry: string, fileName: string): Promise<number> {
  const outputDir = await mkdtemp(join(tmpdir(), 'drop-runtime-size-'))

  try {
    await build({
      configFile: false,
      logLevel: 'error',
      build: {
        emptyOutDir: true,
        lib: {
          entry,
          formats: ['es'],
          fileName,
        },
        minify: 'esbuild',
        outDir: outputDir,
      },
    })

    const outputFile = (await readdir(outputDir)).find(file => file.endsWith('.js'))
    expect(outputFile).toBeDefined()
    return gzipSync(await readFile(join(outputDir, outputFile!))).byteLength
  }
  finally {
    await rm(outputDir, { force: true, recursive: true })
  }
}
