import { ref } from '@vue/reactivity'
import { describe, expect, it } from 'vitest'
import { serializeDropState } from '../../src/runtime/server'

describe('serializeDropState', () => {
  it('serializes refs as current JSON values and escapes script terminators', () => {
    const html = serializeDropState({ user: ref({ name: '</script>' }) })

    expect(html).toBe('{"user":{"name":"\\u003C/script\\u003E"}}')
  })

  it.each([
    () => {},
    new Map(),
    new Date('2026-01-01'),
    (() => {
      const value: { self?: unknown } = {}
      value.self = value
      return value
    })(),
  ])('rejects non-JSON snapshot values', (value) => {
    expect(() => serializeDropState({ value })).toThrow(/JSON-serializable/)
  })
})
