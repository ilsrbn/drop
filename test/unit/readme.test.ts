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
      'ctx.root',
      'ctx.state',
      'ctx.onCleanup',
      'ctx.signal',
      'ctx.computed',
      'ctx.effect',
      'ctx.load',
      'noScripts',
      'prerender',
      'JSON-serializable',
      'string literal',
      'one native HTML root element',
      '5 kB gzip',
      'npm run test',
    ]) {
      expect(readme).toContain(requiredText)
    }
  })

  it('uses Markdown code fences for examples', async () => {
    const readme = await readFile(readmePath, 'utf8')

    expect(readme).toContain('```vue')
    expect(readme).not.toContain('\\`\\`\\`')
  })
})
