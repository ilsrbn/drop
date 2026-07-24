import { describe, expect, it } from 'vitest'
import module from '../../src/module'

describe('micro behavior module', () => {
  it('uses the micro config key', async () => {
    if (!module.getMeta) {
      throw new Error('Nuxt module metadata is unavailable')
    }

    const meta = await module.getMeta()

    expect(meta.name).toBe('nuxt-micro-behaviors')
    expect(meta.configKey).toBe('microBehaviors')
  })
})
