import { createStore } from '#drop/state'

export interface User {
  username: string
}

export const session = createStore<User | null>(null)
