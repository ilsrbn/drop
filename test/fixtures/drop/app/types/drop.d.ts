declare function defineDrop<TState extends Record<string, unknown>>(
  options: { state: TState },
  behavior: (ctx: {
    root: HTMLElement
    state: TState
    onCleanup(cleanup: () => void): void
  }) => void,
): void
