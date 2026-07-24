import { describe, expect, it } from 'vitest'
import { computed, ref } from '../../src/runtime/reactivity'

describe('Drop reactivity', () => {
  it('exports opt-in Vue reactivity primitives', () => {
    const count = ref(1)
    const doubled = computed(() => count.value * 2)

    expect(doubled.value).toBe(2)
  })
})
