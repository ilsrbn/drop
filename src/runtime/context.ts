import type { DropBaseContext, DropSnapshot } from './types'

export interface CleanupScope {
  dispose(): void
  onCleanup(cleanup: () => void): void
}

export function createCleanupScope(): CleanupScope {
  const cleanups = new Set<() => void>()
  let disposed = false

  return {
    onCleanup(cleanup) {
      if (disposed) {
        cleanup()
        return
      }

      cleanups.add(cleanup)
    },
    dispose() {
      if (disposed) {
        return
      }

      disposed = true
      cleanups.forEach(cleanup => cleanup())
      cleanups.clear()
    },
  }
}

export function createDropContext<TState extends DropSnapshot>(
  root: HTMLElement,
  state: TState,
  scope: CleanupScope,
): DropBaseContext<TState> {
  return {
    root,
    state,
    onCleanup: cleanup => scope.onCleanup(cleanup),
  }
}
