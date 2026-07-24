import { isRef } from '@vue/reactivity'
import type { DropSnapshot } from './types'

type JsonValue = boolean | null | number | string | JsonValue[] | { [key: string]: JsonValue }

export function createDropState(behaviorId: string, state: DropSnapshot) {
  return {
    behaviorId,
    serialized: serializeDropState(state),
  }
}

export function defineDropState(_state: DropSnapshot): never {
  throw new Error('defineDropState must be compiled inside a component with a <drop> block')
}

export function serializeDropState(state: DropSnapshot): string {
  return JSON.stringify(toJsonValue(state, new WeakSet()))
    .replace(/</g, '\\u003C')
    .replace(/>/g, '\\u003E')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

function toJsonValue(value: unknown, seen: WeakSet<object>): JsonValue {
  if (isRef(value)) {
    return toJsonValue(value.value, seen)
  }

  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    if (Number.isFinite(value)) {
      return value
    }

    throw new TypeError('Drop state must contain only JSON-serializable values')
  }

  if (typeof value !== 'object') {
    throw new TypeError('Drop state must contain only JSON-serializable values')
  }

  if (seen.has(value)) {
    throw new TypeError('Drop state must contain only JSON-serializable values and no circular references')
  }

  seen.add(value)

  if (Array.isArray(value)) {
    const result = value.map(item => toJsonValue(item, seen))
    seen.delete(value)
    return result
  }

  if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
    throw new TypeError('Drop state must contain only JSON-serializable values')
  }

  const result: Record<string, JsonValue> = {}
  for (const [key, item] of Object.entries(value)) {
    result[key] = toJsonValue(item, seen)
  }
  seen.delete(value)
  return result
}
