import { describe, expect, it } from 'vitest'
import { createCleanupScope } from '../../src/runtime/context'

describe('createCleanupScope', () => {
  it('runs registered cleanups exactly once', () => {
    const cleanups = createCleanupScope()
    const calls: string[] = []

    cleanups.onCleanup(() => calls.push('one'))
    cleanups.dispose()
    cleanups.dispose()

    expect(calls).toEqual(['one'])
  })
})
