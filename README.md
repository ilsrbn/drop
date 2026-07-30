# Drop

Drop is a Nuxt module for small browser behaviors on server-rendered HTML. It
keeps Vue out of the browser when a route uses `noScripts`, then loads only the
behavior declared by a component's `defineDrop` macro.

## Install

```bash
npm install drop
```

```ts
export default defineNuxtConfig({
  modules: ['drop'],
})
```

## Authoring

Declare one behavior in a normal `<script setup>` block. There are no Drop
imports and no custom SFC blocks.

```vue
<template>
  <section>
    <button data-toggle type="button">Toggle</button>
    <p data-message hidden>Open</p>
  </section>
</template>

<script setup lang="ts">
const props = defineProps<{ initiallyOpen: boolean }>()

defineDrop({ state: { initiallyOpen: props.initiallyOpen } }, (ctx) => {
  const button = ctx.root.querySelector<HTMLButtonElement>('[data-toggle]')
  const message = ctx.root.querySelector<HTMLElement>('[data-message]')

  if (!button || !message) {
    throw new Error('Expected Drop targets')
  }

  const open = ctx.signal(ctx.state.initiallyOpen)
  ctx.effect(() => {
    message.hidden = !open()
  })

  const toggle = () => open(!open())
  button.addEventListener('click', toggle)
  ctx.onCleanup(() => button.removeEventListener('click', toggle))
})
</script>
```

`defineDrop` is compiled away. Its `state` is evaluated during SSR, rendered as
escaped JSON on the component root, and passed to the browser callback as
`ctx.state`. The callback becomes an independent `/_drop/<behavior-id>.js`
entry.

## Context

The callback receives only the small Drop context:

- `ctx.root` — the component's one native HTML root;
- `ctx.state` — the serialized SSR snapshot;
- `ctx.onCleanup(fn)` — teardown for listeners, observers, and subscriptions;
- `ctx.signal(value)`, `ctx.computed(fn)`, `ctx.effect(fn)` — Alien Signals
  primitives; an effect is stopped automatically during cleanup;
- `ctx.load('module')` — load a browser dependency. Drop compiles this literal
  call to a dynamic import, so it never runs during SSR.

Use native DOM APIs for selectors, listeners, classes, attributes, and form
values. A Drop callback cannot capture local `<script setup>` values; pass
server values through `state` and create browser-only values inside the callback.

## Constraints

A Drop component requires one `<template>` with one native HTML element root
and one top-level `defineDrop({ state }, callback)` call. Vue template handlers
such as `@click` and bindings such as `v-model` do not run on a `noScripts`
route.

```ts
export default defineNuxtConfig({
  routeRules: {
    '/': { noScripts: true },
  },
})
```

`prerender` controls HTML generation; `noScripts` controls Nuxt's Vue client
bundle. They are independent.

## Size budget

The production core runtime is capped at **5 kB gzip**. Signal code is injected
only when a callback uses `ctx.signal`, `ctx.computed`, or `ctx.effect`; the
production `signal + effect` fixture is capped at **2 kB gzip**.

## Development

```bash
npm install
npm run dev:prepare
npm run lint
npm run test
npm run test:types
```
