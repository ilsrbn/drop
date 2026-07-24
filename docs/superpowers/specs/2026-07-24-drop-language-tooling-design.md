# Drop language tooling — design

## Goal

Make Drop authoring feel like a first-class language inside Vue SFCs across
popular editors. A developer writing `<drop lang="ts">` should get syntax
highlighting, TypeScript diagnostics and navigation, completions, formatting,
and ESLint feedback without changing the Drop runtime model.

The same document also defines the public README that explains Drop to users
and contributors.

## Scope

The first implementation targets TypeScript Drop blocks in `.vue` files. The
language tooling must understand the existing Drop contract:

- one `<drop>` custom block per component;
- `lang="ts"` (with a documented JavaScript fallback);
- browser-safe Drop imports and globals such as `useDropContext` and
  `onCleanup`;
- source locations that map diagnostics and edits back to the original SFC;
- the existing server-side `<script setup>` and template remain independent.

Vue template type-checking and Nuxt application type-checking remain delegated
to Vue Language Tools and Nuxt. Drop tooling must not attempt to reimplement
Vue or Nuxt semantics.

## Architecture

### 1. Shared language-service core

Create a small package/module with no editor-specific dependencies. It owns:

- parsing a `.vue` source and locating the `<drop>` block;
- validating block count, `lang`, and source ranges;
- producing a virtual TypeScript document for the block;
- generating a source map between virtual and SFC offsets;
- injecting Drop ambient types and the configured TypeScript project context;
- returning Drop-specific diagnostics (for example unsupported imports) with
  original SFC ranges.

The virtual document preserves line structure and uses source-map segments for
every copied Drop token. Generated helper text is marked unmapped so errors in
the helper never appear as user errors. The core exposes stable interfaces for
`parse`, `createVirtualDocument`, `getSourceRange`, and diagnostics; adapters
must not parse the SFC independently.

### 2. Volar adapter (primary integration)

Implement a Vue Language Tools embedded-language plugin for the `drop` custom
block. The adapter delegates parsing, virtual-document generation, mappings,
and diagnostics to the shared core, then lets Volar/TypeScript provide:

- syntax-aware TypeScript highlighting inside the block;
- completion, hover, signature help, rename, references, and go-to-definition;
- TypeScript semantic and syntactic diagnostics;
- code actions and formatting where supported by the active TS/formatter setup.

The adapter must preserve normal Vue SFC behavior and be loadable by the
current Volar extension without a Drop-specific fork of Vue Language Tools.

### 3. ESLint processor

Provide an ESLint processor for `.vue` files that extracts each Drop block as a
virtual TypeScript lint target, runs the configured TypeScript parser and
rules, then maps messages and fixes back to the original SFC. It must support
flat config, cache-safe virtual filenames, parser options inherited from the
project, and disable rules that only make sense for Vue templates.

ESLint remains optional. If no TypeScript parser is installed, the processor
returns an actionable configuration message rather than silently skipping the
block.

### 4. Prettier integration

Add a Prettier plugin or processor that formats the contents of `<drop>` with
the selected TypeScript/JavaScript parser while preserving the opening and
closing tags and all unrelated SFC bytes. Formatting must be idempotent and
must not rewrite the generated runtime code.

### 5. Editor fallback layers

- Ship a TextMate grammar/injection for `<drop>` tags and embedded TypeScript
  so highlighting works without a running language server.
- Ship a thin standalone LSP server backed by the shared core and TypeScript
  language service for generic clients (Helix, Zed, Kakoune, custom clients).
- Document the Volar path as the richest experience for `.vue`; document
  standalone LSP as a fallback for clients that cannot load Vue embedded
  language plugins.
- Provide configuration examples for VS Code, Neovim, Zed, Helix, and
  WebStorm. WebStorm support is documented as generic LSP plus grammar where
  available; no JetBrains plugin is required for the first release.

## Public packaging

Keep runtime and tooling packages independently consumable:

- `drop` — existing Nuxt module and runtime;
- `@drop/language-core` — parser, virtual documents, mappings, diagnostics;
- `@drop/volar` — Volar embedded-language adapter;
- `@drop/eslint-plugin` — processor and Drop-specific rules;
- `@drop/prettier-plugin` — formatting support;
- `@drop/language-server` — generic LSP executable;
- `@drop/vscode` — grammar and editor wiring, if marketplace packaging is
  useful after the core stabilizes.

Names may be adjusted to match the repository's final package layout, but the
dependency direction is fixed: adapters depend on the core, and the core does
not depend on an editor or Nuxt.

## README structure

Replace the starter Nuxt-module README with sections in this order:

1. one-paragraph product explanation and badges;
2. when to use Drop and when to use normal Vue hydration;
3. a complete minimal component example;
4. authoring API and browser/server boundary;
5. installation and route requirements (`noScripts`, prerendering);
6. editor and tooling setup matrix;
7. constraints, diagnostics, and troubleshooting;
8. build/runtime architecture diagram in prose;
9. playground, tests, contribution, release, and license information;
10. roadmap for language tooling and optional soft navigation.

Every code sample must use the actual public APIs present in the repository.
The README must explicitly state that template event bindings do not run in a
no-script route unless Drop code registers browser event listeners.

## Data flow and error handling

For each request from an editor, the adapter obtains the current SFC text,
parses the Drop block once, and caches the virtual document by document version.
Malformed Vue or Drop syntax produces diagnostics at the original block range.
Changes outside `<drop>` invalidate only the mapping/state needed by the core;
changes inside it invalidate the virtual TypeScript document. Missing project
configuration falls back to TypeScript defaults and reports a non-fatal hint.

Generated filenames use a stable, workspace-relative convention so TypeScript,
ESLint, and caches agree on module resolution without exposing absolute paths.

## Verification

Tests must cover:

1. parser ranges and diagnostics for valid, missing, and duplicate blocks;
2. virtual-document contents and exact round-trip source mappings;
3. TypeScript diagnostics, completion, hover, and definition mapping;
4. ESLint messages and autofixes mapped to the original SFC;
5. Prettier idempotence and preservation of non-Drop SFC content;
6. standalone LSP initialize/open/change/diagnostics requests;
7. TextMate grammar snapshots for tags, strings, comments, and TypeScript;
8. an integration fixture based on the existing playground components;
9. README snippets and configuration examples staying in sync with the API.

## Non-goals

- a replacement for Vue Language Tools or the TypeScript compiler;
- browser hydration, client routing, or a new Drop component syntax;
- implicit access to all `<script setup>` variables inside `<drop>`;
- a mandatory global state manager;
- editor-specific forks of the Drop compiler;
- guaranteeing identical UI features in every editor.

