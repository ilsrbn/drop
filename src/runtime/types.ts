export type DropSnapshot = Record<string, unknown>

export interface DropContext<TState extends DropSnapshot = DropSnapshot> {
  root: HTMLElement
  state: TState
  onCleanup(cleanup: () => void): void
}

export type DropBehavior<TState extends DropSnapshot = DropSnapshot> =
  (context: DropContext<TState>) => void | (() => void)
