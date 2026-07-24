export interface DropStore<T> {
  get(): T
  set(value: T): void
  subscribe(subscriber: (value: T) => void): () => void
}

export function createStore<T>(initial: T): DropStore<T> {
  let value = initial
  const subscribers = new Set<(value: T) => void>()

  return {
    get: () => value,
    set(next) {
      value = next
      subscribers.forEach(subscriber => subscriber(value))
    },
    subscribe(subscriber) {
      subscribers.add(subscriber)
      subscriber(value)
      return () => subscribers.delete(subscriber)
    },
  }
}
