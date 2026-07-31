# Drop README API Reference Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the README with an accurate English API reference for the published Drop Nuxt module.

**Architecture:** The README remains the sole user-facing documentation artifact. Its statements are derived from the macro transform, generated global declaration, and runtime implementation; a focused Vitest assertion protects the required API topics from disappearing.

**Tech Stack:** Markdown, TypeScript, Vitest, Nuxt module runtime.

---

## File structure

- Modify `README.md`: installation, end-to-end example, API reference, integration contract, diagnostics, and development guidance.
- Modify `test/unit/readme.test.ts`: assert that the complete public context API and compiler contract remain documented.

### Task 1: Specify the README coverage test

**Files:**
- Modify: `test/unit/readme.test.ts`

- [ ] **Step 1: Add complete API-reference assertions**

Extend the existing `requiredText` array with the missing public API and contract terms:

```ts
'ctx.root',
'ctx.state',
'ctx.computed',
'ctx.effect',
'ctx.load',
'JSON-serializable',
'string literal',
'one native HTML root element',
```

- [ ] **Step 2: Run the focused test to verify the current README is incomplete**

Run: `npx vitest run test/unit/readme.test.ts`

Expected: FAIL because the current README does not include every newly required API term.

- [ ] **Step 3: Commit the test change**

```bash
git add test/unit/readme.test.ts
git commit -m "test: cover Drop README API reference"
```

### Task 2: Replace the README with the API reference

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Write the API reference**

Replace the README content with these ordered sections:

```markdown
# Drop

## Installation
## Quick start
## API reference
### defineDrop(options, behavior)
### Drop context
#### ctx.root
#### ctx.state
#### ctx.onCleanup(cleanup)
#### ctx.signal(value)
#### ctx.computed(getter)
#### ctx.effect(fn)
#### ctx.load(specifier)
## State serialization
## Component contract and diagnostics
## Nuxt route behavior
## Runtime size
## Development
```

The quick-start component must register a native click listener, derive `open`
from `ctx.signal`, update the DOM in `ctx.effect`, and unregister the listener
with `ctx.onCleanup`. Explain that `defineDrop` is a compile-time macro; state
is calculated during SSR and supplied to the browser callback after a
JSON-safe serialization. Document each context member according to
`src/runtime/types.ts`, the automatic scope disposal in `src/runtime/client.ts`,
and the literal dynamic import behavior from `src/build/drop-vite-plugin.ts`.

- [ ] **Step 2: Run the focused README test**

Run: `npx vitest run test/unit/readme.test.ts`

Expected: PASS with two tests passed.

- [ ] **Step 3: Run the project lint check**

Run: `npm run lint`

Expected: exit code 0.

- [ ] **Step 4: Commit the documentation update**

```bash
git add README.md
git commit -m "docs: expand Drop API reference"
```
