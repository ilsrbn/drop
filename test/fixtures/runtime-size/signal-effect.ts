import { effect, signal } from '../../../src/runtime/reactivity'

const count = signal(0)

effect(() => {
  count()
})
