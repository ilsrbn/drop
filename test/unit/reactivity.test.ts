import { describe, expect, it } from 'vitest'
import { createDropReactivityScope, computed, effect, signal } from '../../src/runtime/reactivity'

describe('Drop reactivity', () => {
  it('stops behavior effects when its Drop scope is disposed', () => {
    const count = signal(1)
    const scope = createDropReactivityScope()
    let observed = 0

    scope.run(() => {
      effect(() => {
        observed = count()
      })
    })

    count(2)
    expect(observed).toBe(2)

    scope.dispose()
    count(3)
    expect(observed).toBe(2)
  })

  it('supports computed signals', () => {
    const count = signal(1)
    const doubled = computed(() => count() * 2)

    expect(doubled()).toBe(2)
  })
})
