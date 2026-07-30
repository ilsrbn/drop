import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const readmePath = fileURLToPath(new URL('../../README.md', import.meta.url))

describe('README', () => {
  it('does not contain starter template boilerplate', async () => {
    const readme = await readFile(readmePath, 'utf8')

    for (const staleText of ['My Module', 'my-module', 'Foo', 'Bar', 'Baz']) {
      expect(readme).not.toContain(staleText)
    }
  })

  it('documents the macro API, route options, and size budget', async () => {
    const readme = await readFile(readmePath, 'utf8')

    for (const requiredText of [
      'defineDrop',
      'ctx.onCleanup',
      'ctx.signal',
      'noScripts',
      'prerender',
      '5 kB gzip',
      'npm run test',
    ]) {
      expect(readme).toContain(requiredText)
    }
  })
})
