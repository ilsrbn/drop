import { expect, it } from 'vitest'
import { parseDropDocument } from '../src/parse'
import { createDropVirtualDocument } from '../src/virtual-document'

it('creates mapped virtual document with ambient helpers', () => {
  const source = '<template><div/></template><drop lang="ts">\nconst state = useDropContext<{ count: number }>()\n</drop>'
  const parsed = parseDropDocument(source, '/project/src/Widget.vue')
  const doc = createDropVirtualDocument(parsed, { workspaceRoot: '/project' })
  expect(doc.fileName).toBe('src/Widget.vue.drop.ts')
  expect(doc.text).toContain('declare function useDropContext')
  expect(doc.text.split('\n').length).toBeGreaterThanOrEqual(source.split('\n').length)
  const local = doc.text.indexOf('const state')
  expect(doc.toSourceOffset(local)).toBe(parsed.block!.contentStart + 1)
  expect(doc.toVirtualOffset(parsed.block!.contentStart + 1)).toBe(local)
})

it('uses a safe stable filename without workspace root and preserves source line offset', () => {
  const source = '<template>\n<div/>\n</template>\n\n<drop lang="ts">\nconst value = 1\n</drop>'
  const parsed = parseDropDocument(source, '/outside/project/Widget.vue')
  const doc = createDropVirtualDocument(parsed)
  expect(doc.fileName).toMatch(/^Widget\.vue--[0-9a-f]{8}\.drop\.ts$/)
  const sourceLine = source.slice(0, parsed.block!.contentStart).split('\n').length
  const virtualLine = doc.text.slice(0, doc.text.indexOf('const value')).split('\n').length
  expect(virtualLine).toBe(sourceLine + 1)
})

it('keeps out-of-root same-basename files distinct', () => {
  const source = '<drop lang="ts">x</drop>'
  const first = createDropVirtualDocument(parseDropDocument(source, '/one/Widget.vue'), { workspaceRoot: '/workspace' })
  const second = createDropVirtualDocument(parseDropDocument(source, '/two/Widget.vue'), { workspaceRoot: '/workspace' })
  expect(first.fileName).not.toBe(second.fileName)
})
