import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
// @ts-expect-error plain ESM script without types
import { buildDocs, buildLlmsFull } from '../../scripts/build-docs.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const read = (path: string) => readFile(join(root, path), 'utf8')

describe('docs site', () => {
  let out = ''

  beforeAll(async () => {
    out = await buildDocs(await mkdtemp(join(tmpdir(), 'drop-docs-')))
  })

  it('llms-full.txt is README + AGENTS generated from the current sources', async () => {
    const expected = buildLlmsFull(await read('README.md'), await read('AGENTS.md'))
    expect(await readFile(join(out, 'llms-full.txt'), 'utf8')).toBe(expected)
    expect(expected).toContain('## Why Drop')
    expect(expected).toContain('## The one pattern')
  })

  it('serves llms.txt identical to the repository file', async () => {
    expect(await readFile(join(out, 'llms.txt'), 'utf8')).toBe(await read('llms.txt'))
  })

  it('serves every docs page as plain markdown identical to its source', async () => {
    expect(await readFile(join(out, 'index.md'), 'utf8')).toBe(await read('README.md'))
    expect(await readFile(join(out, 'agents.md'), 'utf8')).toBe(await read('AGENTS.md'))
    expect(await readFile(join(out, 'README.md'), 'utf8')).toBe(await read('README.md'))
    expect(await readFile(join(out, 'AGENTS.md'), 'utf8')).toBe(await read('AGENTS.md'))
  })

  it('renders HTML pages with working internal links', async () => {
    const index = await readFile(join(out, 'index.html'), 'utf8')
    expect(index).toContain('<h1>Drop</h1>')
    expect(index).toContain('href="/agents"')
    expect(index).not.toContain('href="./AGENTS.md"')
    expect(await readFile(join(out, 'agents.html'), 'utf8')).toContain('The one pattern')
  })
})
