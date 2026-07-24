import { createCleanupScope, createDropContext, type CleanupScope } from './context'
import type { DropBehavior, DropSnapshot } from './types'

const scopesByBehavior = new Map<string, CleanupScope[]>()

export function mountDropBehavior(id: string, behavior: DropBehavior): void {
  disposeDropBehavior(id)

  const scopes: CleanupScope[] = []
  const roots = document.querySelectorAll<HTMLElement>('[data-drop-root]')

  for (const root of roots) {
    if (root.dataset.dropRoot !== id) {
      continue
    }

    const state = readDropState(id, root.dataset.dropState)
    const scope = createCleanupScope()
    const cleanup = behavior(createDropContext(root, state, scope))
    if (cleanup) {
      scope.onCleanup(cleanup)
    }
    scopes.push(scope)
  }

  scopesByBehavior.set(id, scopes)
}

function disposeDropBehavior(id: string): void {
  scopesByBehavior.get(id)?.forEach(scope => scope.dispose())
  scopesByBehavior.delete(id)
}

function readDropState(id: string, stateId: string | undefined): DropSnapshot {
  const record = Array.from(document.querySelectorAll<HTMLScriptElement>('[data-drop-state-record]'))
    .find(element => element.dataset.dropStateRecord === stateId)

  if (!record) {
    throw new Error(`Drop behavior "${id}" could not find its state record`)
  }

  try {
    const state = JSON.parse(record.textContent ?? '')
    if (!state || typeof state !== 'object' || Array.isArray(state)) {
      throw new Error('state must be an object')
    }
    return state as DropSnapshot
  }
  catch (error) {
    throw new Error(`Drop behavior "${id}" has invalid state: ${error instanceof Error ? error.message : String(error)}`)
  }
}
