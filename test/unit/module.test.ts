import { describe, expect, it } from 'vitest'
import module from '../../src/module'

describe('drop module', () => {
  it('uses the drop config key', async () => {
    if (!module.getMeta) {
      throw new Error('Nuxt module metadata is unavailable')
    }

    const meta = await module.getMeta()

    expect(meta.name).toBe('drop')
    expect(meta.version).toBe('1.0.2')
    expect(meta.configKey).toBe('drop')
    expect(meta.compatibility).toEqual({ nuxt: '^4.5.0' })
  })
})
