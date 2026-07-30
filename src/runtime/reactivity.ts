import { effectScope } from 'alien-signals'

export { computed, effect, signal } from 'alien-signals'

export interface DropReactivityScope {
  dispose(): void
  run<T>(fn: () => T): T
}

export function createDropReactivityScope(): DropReactivityScope {
  let stopScope: (() => void) | undefined

  return {
    run<T>(fn: () => T): T {
      let result!: T
      stopScope = effectScope(() => {
        result = fn()
      })
      return result
    },
    dispose() {
      stopScope?.()
      stopScope = undefined
    },
  }
}
