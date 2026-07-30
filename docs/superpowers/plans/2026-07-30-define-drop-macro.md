# Define Drop Macro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy `<drop>` custom block with `defineDrop({ state }, callback)`, keep generated behaviors independent of Vue hydration, and remove legacy editor tooling.

**Architecture:** The SFC transform locates one top-level `defineDrop` call in `<script setup>`, replaces it with SSR state/asset registration, and emits the callback body as an independently bundled browser behavior. Generated behaviors construct a small `ctx` with only referenced Alien Signals helpers and rewrite `ctx.load('literal')` to dynamic imports.

**Tech Stack:** Nuxt module, Vue SFC compiler, Babel parser, MagicString, Vite, Alien Signals, Vitest.

---

### Task 1: Macro parser and transform

**Files:**
- Modify: `src/build/parse-drop-sfc.ts`
- Modify: `src/build/drop-vite-plugin.ts`
- Test: `test/unit/parse-drop-sfc.test.ts`
- Test: `test/unit/drop-vite-plugin.test.ts`

- [ ] Replace legacy fixture SFCs with `defineDrop({ state }, (ctx) => {})` and assert the callback is removed from Vue output, its state reaches `createDropState`, and the root receives Drop attributes.
- [ ] Run focused parser/transform tests to establish the legacy implementation fails the new assertions.
- [ ] Parse `<script setup>` with Babel, validate exactly one top-level macro, extract its object `state` value and block callback, and transform the SFC with MagicString.
- [ ] Emit a browser behavior that supplies only static `ctx.signal`, `ctx.computed`, and `ctx.effect` usages, scopes effects to cleanup, and compiles `ctx.load('literal')` to dynamic import.
- [ ] Run focused parser/transform tests and confirm they pass.

### Task 2: Runtime/module API and application fixtures

**Files:**
- Modify: `src/module.ts`
- Modify: `src/runtime/server.ts`
- Modify: `src/runtime/reactivity.ts`
- Modify: `src/runtime/types.ts`
- Modify: `playground/app/components/LoginDialog.vue`
- Modify: `playground/app/components/UserHeader.vue`
- Modify: `test/fixtures/drop/**/*.vue`
- Modify: `test/fixtures/drop-dist/**/*.vue`
- Test: `test/unit/server.test.ts`
- Test: `test/drop-ssr.test.ts`

- [ ] Write/update assertions for the `defineDrop` macro runtime guard, signal cleanup, and SSR behavior assets.
- [ ] Register only `defineDrop` with Nuxt, remove `defineDropState`, serialize `options.state`, and update all in-repository components to the macro API.
- [ ] Run focused runtime and SSR tests.

### Task 3: Remove legacy tooling and publish documentation

**Files:**
- Modify: `README.md`
- Modify: `package.json`
- Delete: `packages/language-core/`, `packages/volar/`, `packages/eslint-plugin/`, `packages/zed/`, `.zed/`
- Delete: legacy `<drop>` design/plans and language fixtures
- Test: `test/unit/readme.test.ts`

- [ ] Replace README examples and contract descriptions with the no-import `ctx` macro API and size budget.
- [ ] Delete custom-block tooling/packages, their workspace references, and obsolete test/fixture/docs files.
- [ ] Update README assertions and run focused documentation tests.

### Task 4: Verify and publish

**Files:**
- Verify: entire repository

- [ ] Run runtime-size, parser, SSR, and full Vitest suites; run typecheck and lint after legacy tooling removal.
- [ ] Inspect the staged diff, commit only the confirmed migration scope, push `agent/define-drop-macro`, and open a draft pull request.
