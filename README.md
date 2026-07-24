# Drop

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

Drop is a Nuxt module for adding small, opt-in browser behaviors to server-rendered and static HTML. A Vue single-file component keeps its normal SSR template, while a `<drop>` block is compiled into a separate browser entry and loaded for the matching root element.

This is useful when most of a route should stay static, but a dialog, menu, form, or other island needs a little client-side behavior. Drop does not replace Vue components: it gives you an explicit, DOM-first boundary for behavior that should hydrate independently.

## Installation

```bash
npm install drop
```

Register the module in `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['drop'],
})
```

The module has no required runtime configuration. It adds the `drop` SFC transform and serves generated behavior entries from `/_drop/`.

## Minimal component

```vue
<template>
  <button type="button" data-toggle>Open</button>
  <p data-message hidden>Drop is running.</p>
</template>

<script setup lang="ts">
defineDropState({})
</script>

<drop lang="ts">
const { root, onCleanup } = useDropContext()
const toggle = root.querySelector<HTMLButtonElement>('[data-toggle]')
const message = root.querySelector<HTMLElement>('[data-message]')

if (!toggle || !message) {
  throw new Error('Expected Drop targets are missing')
}

const handleClick = () => {
  message.hidden = !message.hidden
}

toggle.addEventListener('click', handleClick)
onCleanup(() => toggle.removeEventListener('click', handleClick))
</drop>
```

`defineDropState()` is a compile-time macro made available by the module. The `<drop>` block runs in the browser with a context containing `root`, serialized `state`, and `onCleanup()`. The block itself is removed from the Vue SFC before Vue compilation.

Do not rely on Vue template handlers (`@click`, `v-on`, and similar) for a `noScripts` route: those handlers do not run when Nuxt omits the Vue client bundle. Put the behavior in `<drop>` instead.

## Authoring API

### State

Pass a JSON-serializable object to `defineDropState()` in `<script setup>`. The value is rendered into the root element and is available as `state` in the Drop context:

```vue
<script setup lang="ts">
const props = defineProps<{ user: { name: string } | null }>()
defineDropState({ user: props.user })
</script>

<drop lang="ts">
const { state } = useDropContext<{ user: { name: string } | null }>()
console.log(state.user)
</drop>
```

State may contain plain objects, arrays, strings, numbers, booleans, `null`, and Vue refs (their values are serialized). Functions, class instances, `undefined`, non-finite numbers, and circular structures are rejected during SSR.

### Context and cleanup

`useDropContext()` is available inside a `<drop>` block and returns:

- `root: HTMLElement` — the component's single DOM root;
- `state` — the deserialized snapshot from `defineDropState()`;
- `onCleanup(fn)` — registers teardown work for navigation, replacement, or hot reload.

The behavior may also return a cleanup function. Register every event listener, observer, subscription, or timer for disposal.

### Shared stores and reactivity

Drop-safe aliases are available to generated browser entries:

```ts
import { createStore } from '#drop/state'
import { computed, effect, ref, watch } from '#drop/reactivity'
```

`createStore(initial)` returns `get()`, `set(value)`, and `subscribe(listener)`. The reactivity alias re-exports Vue's `@vue/reactivity` primitives. Keep browser behavior independent from Vue runtime imports.

## Route requirements and boundaries

A Drop component must contain:

- one `<template>` with exactly one HTML element root (not a component root);
- one `<script setup>` block;
- exactly one `<drop>` block;
- a `defineDropState(...)` call in `<script setup>`.

The `<drop>` block may use `lang="js"` (the default) or `lang="ts"`. It is compiled as a standalone browser module and mounted against roots marked with `data-drop-root`. Imports from `vue`, `#app`, `#imports`, `nuxt`, or `nuxt/*` are intentionally forbidden. Import application/shared browser modules instead.

`routeRules: { '/path': { noScripts: true } }` is a good fit for static or prerendered routes. Drop's generated entry is still loaded for a component on that route; Vue template hydration is not. `prerender` controls when Nuxt generates HTML, while `noScripts` controls whether Nuxt emits the Vue client scripts—these options are independent.

## Editor and linting support

The language-tooling packages are planned, not part of the current npm package. The intended compatibility layers are:

- Volar/Vue Language Tools integration for `<drop lang="ts">` diagnostics, completion, navigation, and TypeScript checking;
- an ESLint processor that maps the custom block back to the `.vue` source;
- a Prettier plugin for formatting the block while preserving SFC offsets;
- TextMate grammars for syntax highlighting in editors without a Vue language server;
- a standalone LSP for Helix, Zed, Neovim, and other LSP clients.

Until those packages are published, use the playground and the project's TypeScript/Vitest checks as the source of truth. Do not add editor setup commands from this roadmap to an application yet.

## Diagnostics and troubleshooting

- **`defineDropState requires a <drop> block`** — add one `<drop>` block or remove the macro.
- **`a component can contain only one <drop> block`** — combine behavior into a single block.
- **`requires one HTML root element`** — wrap siblings in one native element; do not use a component as the root.
- **`<drop> cannot import ...`** — remove Vue/Nuxt runtime imports and use DOM APIs or Drop-safe aliases.
- **Behavior is not running** — check that the route is served by Nuxt, the generated `/_drop/*.js` entry is reachable, and selectors match the rendered markup.
- **Nothing happens on a `noScripts` route** — Vue `@click` and other template listeners are expected not to run; move that logic into `<drop>`.

## Architecture

The Vite transform parses each Vue SFC, validates its Drop contract, removes the custom block from the Vue source, and annotates the HTML root with a stable behavior id and serialized state. A separate build step emits one browser entry per Drop block. At runtime the entry finds matching roots, creates a cleanup scope, and mounts the behavior. Generated files are exposed under `/_drop/`.

## Development

```bash
npm install
npm run dev:prepare  # build the module stub and prepare Nuxt types
npm run dev          # run the playground
npm run dev:build    # build the playground
```

The playground contains working examples in `playground/app/components/` and shared browser state in `playground/shared/drop/`.

## Testing

```bash
npm run lint
npm run test
npm run test:types
```

Use `npm run test:watch` for an interactive Vitest session.

## Release

```bash
npm run release
```

The release script runs linting, tests, the package build, changelog generation, publish, and tag push. Publishing requires npm and GitHub credentials configured in your environment.

## Roadmap

- Volar, ESLint, Prettier, TextMate, and standalone-LSP adapters described above;
- richer diagnostics for state serializability and forbidden imports;
- editor fixtures covering VS Code, WebStorm, Neovim, Helix, and Zed.

## License

MIT © [ilsrbn](https://github.com/ilsrbn)

[npm-version-src]: https://img.shields.io/npm/v/drop/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/drop
[npm-downloads-src]: https://img.shields.io/npm/dm/drop.svg?style=flat&colorA=020420&colorB=00DC82
[npm-downloads-href]: https://npm.chart.dev/drop
[license-src]: https://img.shields.io/npm/l/drop.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/drop
[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt
[nuxt-href]: https://nuxt.com
