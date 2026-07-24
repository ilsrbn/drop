export type MicroSnapshot = Record<string, unknown>

export interface MicroContext<TState extends MicroSnapshot = MicroSnapshot> {
  root: HTMLElement
  state: TState
  onCleanup(cleanup: () => void): void
}

export type MicroBehavior<TState extends MicroSnapshot = MicroSnapshot> =
  (context: MicroContext<TState>) => void | (() => void)
