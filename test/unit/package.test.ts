import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const packagePath = fileURLToPath(new URL('../../package.json', import.meta.url))
const licensePath = fileURLToPath(new URL('../../LICENSE', import.meta.url))

describe('npm package metadata', () => {
  it('includes package discovery and support links', async () => {
    const packageJson = JSON.parse(await readFile(packagePath, 'utf8'))

    expect(packageJson.author).toBe('ilsrbn <serbini271@gmail.com>')
    expect(packageJson.keywords).toEqual(expect.arrayContaining(['nuxt-module', 'ssr']))
    expect(packageJson.homepage).toBe('https://github.com/ilsrbn/drop#readme')
    expect(packageJson.bugs).toEqual({ url: 'https://github.com/ilsrbn/drop/issues' })
  })

  it('ships the declared MIT license text', async () => {
    await expect(readFile(licensePath, 'utf8')).resolves.toContain('MIT License')
  })
})
