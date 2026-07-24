// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import { mountDropBehavior } from '../../src/runtime/client'

function record(id: string, state: unknown) {
  return `<section data-drop-root="${id}" data-drop-state='${JSON.stringify(state)}'></section>`
}

describe('mountDropBehavior', () => {
  it('mounts every marker and passes its state to the behavior', () => {
    document.body.innerHTML = `${record('UserHeader', { user: null })}${record('UserHeader', { user: { username: 'Ada' } })}`
    const users: unknown[] = []

    mountDropBehavior('UserHeader', ({ state }) => {
      users.push(state.user)
    })

    expect(users).toEqual([null, { username: 'Ada' }])
  })

  it('disposes previous mounts before a remount', () => {
    document.body.innerHTML = record('UserHeader', { user: null })
    const dispose = vi.fn()

    mountDropBehavior('UserHeader', () => dispose)
    mountDropBehavior('UserHeader', () => undefined)

    expect(dispose).toHaveBeenCalledOnce()
  })
})
