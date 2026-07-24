# Drop README Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the starter Nuxt-module README with accurate Drop documentation for users, editor tooling, and contributors.

**Architecture:** The README is documentation-only and mirrors the existing public API and the language-tooling design. Examples are copied from the playground/test fixtures and are checked by a lightweight documentation test for required API markers.

**Tech Stack:** Markdown, Vue SFC, TypeScript, Nuxt 4, Drop custom block.

---

### Task 1: Inventory public behavior and examples

**Files:**
- Read: `src/module.ts`
- Read: `src/build/parse-drop-sfc.ts`
- Read: `src/runtime/context.ts`
- Read: `src/runtime/server.ts`
- Read: `playground/app/components/LoginDialog.vue`
- Read: `playground/app/components/UserHeader.vue`

- [ ] **Step 1: Record the README contract**

Use the existing implementation to list the exact public names (`defineDropState`, `useDropContext`, `onCleanup`, `createStore`, `#drop/reactivity`) and the exact constraints (one HTML root, one Drop block, `noScripts`, forbidden imports).

- [ ] **Step 2: Confirm local documentation commands**

Use the commands already declared in `package.json`: `npm install`, `npm run dev:prepare`, `npm run dev`, `npm run dev:build`, `npm run lint`, `npm run test`, and `npm run test:types`.

### Task 2: Rewrite README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace starter template content**

Write the README sections in this order: product explanation, Drop vs Vue hydration, installation, minimal component, authoring API, route requirements, browser/server boundary, editor matrix, diagnostics/troubleshooting, architecture, development, testing, release, roadmap, and license.

- [ ] **Step 2: Add an accurate minimal SFC example**

Use a single real HTML root, `<script setup lang="ts">defineDropState({})</script>`, and `<drop lang="ts">` with `useDropContext()` and `onCleanup()`. State explicitly that template `@click` handlers do not run on a no-script route.

- [ ] **Step 3: Document tooling without promising unavailable features**

Describe the planned Volar, ESLint, Prettier, TextMate, and standalone-LSP layers as roadmap/tooling status until their packages exist. Include editor-specific setup placeholders only as clearly marked planned configuration, never as installable commands.

- [ ] **Step 4: Add badges and repository links**

Use package name `drop`, repository `ilsrbn/drop`, MIT license, Nuxt, and local links that exist in this repository. Remove all `my-module` and template boilerplate references.

### Task 3: Verify README

**Files:**
- Create: `test/unit/readme.test.ts`
- Test: `test/unit/readme.test.ts`

- [ ] **Step 1: Write assertions for stale template removal**

Assert that `README.md` does not contain `My Module`, `my-module`, or the template feature names `Foo`, `Bar`, and `Baz`.

- [ ] **Step 2: Write assertions for required API coverage**

Assert that README contains `<drop`, `defineDropState`, `useDropContext`, `onCleanup`, `noScripts`, `prerender`, `ESLint`, `Volar`, `Prettier`, and `npm run test`.

- [ ] **Step 3: Run the focused test**

Run `npx vitest run test/unit/readme.test.ts` and expect PASS.

- [ ] **Step 4: Run lint and the full unit suite**

Run `npm run lint` and `npm test`; expect both commands to exit with code 0.

- [ ] **Step 5: Commit the documentation change**

```bash
git add README.md test/unit/readme.test.ts
git commit -m "docs: document Drop usage and tooling"
```

