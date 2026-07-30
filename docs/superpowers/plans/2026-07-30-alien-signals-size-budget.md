# Alien Signals Size Budget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Use Alien Signals behind Drop's runtime API and enforce a production gzip-size budget.

**Architecture:** Drop keeps its public runtime facade and maps each mounted behavior to an Alien Signals effect scope. The build test creates a minimal production entry, measures gzip size, and fails when the core runtime budget is exceeded.

**Tech Stack:** TypeScript, Vitest, tsup, Alien Signals, Node zlib.

---

### Task 1: Add the reactivity dependency and lifecycle adapter

**Files:**
- Modify: `package.json`
- Modify: `src/runtime/reactivity.ts`
- Test: `test/unit/reactivity.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it('stops effects registered in a Drop scope', () => {
  const count = signal(0)
  const scope = createDropReactivityScope()
  let observed = 0

  scope.run(() => effect(() => { observed = count() }))
  count(1)
  scope.dispose()
  count(2)

  expect(observed).toBe(1)
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npx vitest run test/unit/reactivity.test.ts`

Expected: FAIL because the Drop reactivity scope API does not exist.

- [ ] **Step 3: Implement the smallest adapter**

```ts
import { effectScope } from 'alien-signals'

export function createDropReactivityScope() {
  let stop = () => {}
  return {
    run<T>(fn: () => T) { stop = effectScope(fn); return fn },
    dispose() { stop() },
  }
}
```

Expose only the signal primitives needed by Drop from this module.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `npx vitest run test/unit/reactivity.test.ts`

Expected: PASS.

### Task 2: Add a production gzip-size regression test

**Files:**
- Test: `test/unit/runtime-size.test.ts`
- Modify: `package.json` if a build script must expose the runtime entry

- [ ] **Step 1: Write the failing size test**

```ts
it('keeps the core runtime at or below 5 kB gzip', async () => {
  const output = await buildRuntimeFixture('core')
  expect(gzipSize(output)).toBeLessThanOrEqual(5 * 1024)
})
```

The fixture imports only the mount/runtime APIs, bundles with the production
build configuration, and measures bytes with `node:zlib`.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npx vitest run test/unit/runtime-size.test.ts`

Expected: FAIL because no runtime size test exists.

- [ ] **Step 3: Implement only the test harness needed to bundle and measure the entry**

Use the repository's existing bundler rather than adding a second build tool.
The test must print the measured gzip byte count in its assertion message.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `npx vitest run test/unit/runtime-size.test.ts`

Expected: PASS and report a gzip size at or below 5120 bytes.

### Task 3: Verify the complete change

**Files:**
- Verify: `test/unit/reactivity.test.ts`
- Verify: `test/unit/runtime-size.test.ts`

- [ ] **Step 1: Run focused tests**

Run: `npx vitest run test/unit/reactivity.test.ts test/unit/runtime-size.test.ts`

Expected: PASS.

- [ ] **Step 2: Run repository quality checks**

Run: `npm run lint && npm run test && npm run test:types`

Expected: all commands exit 0.
