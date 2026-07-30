export type DropSnapshot = Record<string, unknown>
export type DropCleanup = () => unknown

export interface DropBaseContext<TState extends DropSnapshot = DropSnapshot> {
  root: HTMLElement
  state: TState
  onCleanup(cleanup: () => void): void
}

export interface DropContext<TState extends DropSnapshot = DropSnapshot> extends DropBaseContext<TState> {
  signal<T>(value: T): { (): T, (value: T): void }
  computed<T>(getter: (previousValue?: T) => T): () => T
  effect(fn: () => unknown): DropCleanup
  load<TModule>(specifier: string): Promise<TModule>
}

export type DropBehavior<TState extends DropSnapshot = DropSnapshot> = (context: DropBaseContext<TState>) =>
  | DropCleanup
  | undefined
  | Promise<DropCleanup | undefined>
