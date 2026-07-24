// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import { mountDropBehavior } from '../../src/runtime/client'

function record(id: string, key: string, state: unknown) {
  return `<section data-drop-root="${id}" data-drop-state="${key}"></section><script type="application/json" data-drop-state-record="${key}">${JSON.stringify(state)}</script>`
}

describe('mountDropBehavior', () => {
  it('mounts every marker and passes its state to the behavior', () => {
    document.body.innerHTML = `${record('UserHeader', 'one', { user: null })}${record('UserHeader', 'two', { user: { username: 'Ada' } })}`
    const users: unknown[] = []

    mountDropBehavior('UserHeader', ({ state }) => {
      users.push(state.user)
    })

    expect(users).toEqual([null, { username: 'Ada' }])
  })

  it('disposes previous mounts before a remount', () => {
    document.body.innerHTML = record('UserHeader', 'one', { user: null })
    const dispose = vi.fn()

    mountDropBehavior('UserHeader', () => dispose)
    mountDropBehavior('UserHeader', () => undefined)

    expect(dispose).toHaveBeenCalledOnce()
  })
})
