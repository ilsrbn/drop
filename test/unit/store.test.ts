import { describe, expect, it } from 'vitest'
import { createStore } from '../../src/runtime/store'

describe('createStore', () => {
  it('notifies subscribers with the latest value and supports unsubscribe', () => {
    const store = createStore(0)
    const received: number[] = []
    const unsubscribe = store.subscribe(value => received.push(value))

    store.set(1)
    unsubscribe()
    store.set(2)

    expect(received).toEqual([0, 1])
    expect(store.get()).toBe(2)
  })
})
