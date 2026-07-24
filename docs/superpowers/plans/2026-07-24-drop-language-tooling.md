# Drop Language Tooling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shared Drop language core plus Volar, ESLint, Prettier, TextMate, and generic LSP integrations for `<drop>` blocks in Vue SFCs.

**Architecture:** Add tooling as independent packages under `packages/`. `@drop/language-core` is editor- and Nuxt-independent and owns parsing, virtual TypeScript text, mappings, and diagnostics. Every adapter consumes that core; no adapter reparses SFCs or modifies runtime compilation.

**Tech Stack:** TypeScript, `@vue/compiler-sfc`, TypeScript Language Service, Volar language-plugin API, ESLint flat-config processor API, Prettier plugin API, `vscode-languageserver`, TextMate grammar, Vitest.

---

### Task 1: Establish package layout and shared test fixtures

**Files:**
- Modify: `package.json`
- Create: `packages/language-core/package.json`
- Create: `packages/language-core/tsconfig.json`
- Create: `test/fixtures/language/ValidWidget.vue`
- Create: `test/fixtures/language/tsconfig.json`

- [ ] **Step 1: Add workspace package definitions**

Add `packages/*` to the root workspaces and define `@drop/language-core` as an ESM TypeScript package with `build`, `test`, and `typecheck` scripts consistent with the root package.

- [ ] **Step 2: Create the fixture SFC**

Put a valid one-root component in `test/fixtures/language/ValidWidget.vue` with `<script setup lang="ts">defineDropState({ count: 1 })</script>` and a `<drop lang="ts">` block that calls `useDropContext<{ count: number }>()`.

- [ ] **Step 3: Add the fixture compiler configuration**

Configure `test/fixtures/language/tsconfig.json` with strict TypeScript, DOM libs, and a path alias for the Drop ambient declarations used by the virtual file.

### Task 2: Implement parser, virtual document, and source maps

**Files:**
- Create: `packages/language-core/src/types.ts`
- Create: `packages/language-core/src/parse.ts`
- Create: `packages/language-core/src/virtual-document.ts`
- Create: `packages/language-core/src/index.ts`
- Create: `packages/language-core/test/parse.test.ts`
- Create: `packages/language-core/test/virtual-document.test.ts`

- [ ] **Step 1: Write failing parser tests**

Cover no Drop block, one block, duplicate blocks, missing `lang`, and malformed Vue. Assert original offsets for the opening tag, content start, content end, and closing tag.

- [ ] **Step 2: Implement parser types and parser**

Expose `parseDropDocument(source, filename)` returning the Drop block range, language, content, and diagnostics. Use `@vue/compiler-sfc` and return diagnostics in original SFC coordinates.

- [ ] **Step 3: Run parser tests**

Run `npx vitest run packages/language-core/test/parse.test.ts`; expect the duplicate/missing cases to fail before implementation and pass after it.

- [ ] **Step 4: Write failing virtual-document tests**

Assert that the virtual document has stable filename, preserves line count for copied Drop content, includes `useDropContext` ambient declarations, and maps a virtual content offset back to the exact SFC offset.

- [ ] **Step 5: Implement virtual document and mappings**

Create `createDropVirtualDocument(parsed, projectOptions)` with `text`, `fileName`, and `mappings`. Keep generated helper text unmapped and expose `toSourceOffset`/`toVirtualOffset`.

- [ ] **Step 6: Run focused core tests**

Run `npx vitest run packages/language-core/test`; expect PASS.

- [ ] **Step 7: Export the stable core API**

Export parser, virtual document, mapping types, and diagnostic helpers only from `packages/language-core/src/index.ts`.

### Task 3: Add Drop-specific diagnostics and TypeScript service bridge

**Files:**
- Create: `packages/language-core/src/diagnostics.ts`
- Create: `packages/language-core/src/typescript-service.ts`
- Create: `packages/language-core/test/typescript-service.test.ts`

- [ ] **Step 1: Write failing diagnostics tests**

Cover forbidden imports (`vue`, `#app`, `#imports`, and `nuxt/*`), unknown identifiers, completion after `state.`, and definition mapping to a project source file.

- [ ] **Step 2: Implement Drop diagnostics**

Reuse the existing forbidden-import rule semantics and report each violation at its import string range in the original SFC.

- [ ] **Step 3: Implement the TypeScript language-service bridge**

Create an in-memory `LanguageServiceHost` for the virtual document, include project files from the configured host, and map diagnostics/completions/definitions through the core source map.

- [ ] **Step 4: Run TypeScript bridge tests**

Run `npx vitest run packages/language-core/test/typescript-service.test.ts`; expect PASS with original `.vue` ranges.

### Task 4: Implement the Volar embedded-language adapter

**Files:**
- Create: `packages/volar/package.json`
- Create: `packages/volar/src/index.ts`
- Create: `packages/volar/test/plugin.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing plugin test**

Pass a Vue SFC containing `<drop>` to the plugin and assert it exposes an embedded TypeScript file, source mappings, and Drop diagnostics without changing the normal Vue embedded files.

- [ ] **Step 2: Implement the Volar plugin adapter**

Register the `drop` custom block as an embedded TypeScript language, delegate document creation and mappings to `@drop/language-core`, and expose the TypeScript service hooks supported by the installed Volar API.

- [ ] **Step 3: Run plugin tests and typecheck**

Run `npx vitest run packages/volar/test/plugin.test.ts` and `npm run test:types`; expect PASS.

### Task 5: Implement ESLint processor

**Files:**
- Create: `packages/eslint-plugin/package.json`
- Create: `packages/eslint-plugin/src/processor.ts`
- Create: `packages/eslint-plugin/src/index.ts`
- Create: `packages/eslint-plugin/test/processor.test.ts`

- [ ] **Step 1: Write failing processor tests**

Lint a `.vue` fixture containing an unused variable and an autofixable quote rule inside `<drop>`. Assert message ranges and fixes point to the original SFC, while template text is untouched.

- [ ] **Step 2: Implement extraction and filename normalization**

Return a virtual `.drop.ts` text and stable workspace-relative filename from `preprocess`; inherit flat-config parser options and TypeScript parser selection.

- [ ] **Step 3: Implement postprocess mapping**

Map line/column ranges and fix ranges from virtual lint output through the core mappings. Return a configuration diagnostic when the selected TypeScript parser is unavailable.

- [ ] **Step 4: Run processor tests**

Run `npx vitest run packages/eslint-plugin/test/processor.test.ts`; expect PASS.

### Task 6: Implement Prettier and TextMate fallback

**Files:**
- Create: `packages/prettier-plugin/package.json`
- Create: `packages/prettier-plugin/src/index.ts`
- Create: `packages/prettier-plugin/test/plugin.test.ts`
- Create: `packages/vscode/syntaxes/drop.tmLanguage.json`
- Create: `packages/vscode/package.json`
- Create: `packages/vscode/test/grammar.test.ts`

- [ ] **Step 1: Write failing Prettier tests**

Format a component with an unformatted Drop block and assert only the block body changes, formatting is idempotent, and both SFC tags remain byte-for-byte valid.

- [ ] **Step 2: Implement the Prettier plugin**

Extract Drop content, call Prettier with `typescript` or `babel` based on `lang`, then splice the formatted body back using the core range.

- [ ] **Step 3: Run Prettier tests**

Run `npx vitest run packages/prettier-plugin/test/plugin.test.ts`; expect PASS.

- [ ] **Step 4: Write grammar snapshot tests**

Cover `<drop lang="ts">`, TypeScript comments/strings/keywords, and closing tags without treating ordinary Vue markup as Drop code.

- [ ] **Step 5: Add the TextMate grammar**

Define an embedded TypeScript injection scoped only between Drop custom-block tags and package it as editor grammar data.

- [ ] **Step 6: Run grammar tests**

Run `npx vitest run packages/vscode/test/grammar.test.ts`; expect PASS.

### Task 7: Implement the standalone LSP server

**Files:**
- Create: `packages/language-server/package.json`
- Create: `packages/language-server/src/server.ts`
- Create: `packages/language-server/src/index.ts`
- Create: `packages/language-server/test/server.test.ts`

- [ ] **Step 1: Write failing protocol tests**

Send `initialize`, `textDocument/didOpen`, `textDocument/didChange`, and `textDocument/diagnostic` messages over an in-memory JSON-RPC connection. Assert diagnostics use `.vue` ranges and updates replace the cached virtual document.

- [ ] **Step 2: Implement document store and server handlers**

Maintain open-document text by URI/version, call the shared core for each version, and implement diagnostics, hover, completion, definition, and shutdown handlers using LSP types.

- [ ] **Step 3: Add executable entry point**

Expose a bin command named `drop-language-server` that starts stdio transport and resolves workspace-relative TypeScript configuration.

- [ ] **Step 4: Run LSP tests**

Run `npx vitest run packages/language-server/test/server.test.ts`; expect PASS.

### Task 8: Integration fixtures, docs, and verification

**Files:**
- Create: `test/language-tooling.integration.test.ts`
- Modify: `README.md`
- Modify: `package.json`

- [ ] **Step 1: Add a playground-based integration test**

Open the existing `playground/app/components/LoginDialog.vue` and `UserHeader.vue`, create virtual files, and assert imports, context globals, and source mappings work for both components.

- [ ] **Step 2: Add editor setup documentation**

Document installation/configuration for VS Code/Volar, Neovim, Zed, Helix, and WebStorm. Clearly distinguish available packages from planned fallback support.

- [ ] **Step 3: Add root scripts**

Add `test:language`, `build:language`, and `test:types:language` scripts that run all tooling package tests/builds without invoking the Nuxt playground.

- [ ] **Step 4: Run the complete verification set**

Run `npm run lint`, `npm test`, `npm run test:types`, `npm run test:language`, and `git diff --check`; expect all commands to pass.

- [ ] **Step 5: Commit the language tooling implementation**

```bash
git add package.json packages test README.md
git commit -m "feat: add Drop language tooling"
```

