# Drop — instructions for AI coding agents

`@ilsrbn/drop` is a Nuxt module (Nuxt `^4.5.0`) that adds small, opt-in browser
behaviors to server-rendered or static routes, without hydrating the page with
Vue. Use it when a route is mostly static HTML (often with
`routeRules: { '/path/**': { noScripts: true } }`) but a few components still
need JavaScript: a dialog, a toggle, a header that reads a session.

Full documentation: [README.md](./README.md). Machine-readable index:
[llms.txt](./llms.txt).

## Install

```bash
npm install @ilsrbn/drop
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@ilsrbn/drop'],
})
```

## The one pattern

`defineDrop` is a compile-time macro, global in `<script setup>`. It has no
runtime return value. The callback is emitted as `/_drop/<behavior-id>.js` and
runs only in the browser, mounted on the component's root element.

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
  if (!button || !message) throw new Error('Expected toggle and message elements')

  const open = ctx.signal(ctx.state.initiallyOpen)
  ctx.effect(() => { message.hidden = !open() })

  const toggle = () => open(!open())
  button.addEventListener('click', toggle)
  ctx.onCleanup(() => button.removeEventListener('click', toggle))
})
</script>
```

## Rules that must hold (violations are build-time errors)

1. The component has exactly one `<template>` with exactly one native HTML root
   element (not a component, not a fragment).
2. Exactly one top-level `defineDrop({ state }, callback)` call in
   `<script setup>`.
3. `options` is an object with a `state` property.
4. The callback is an inline arrow function or function expression with exactly
   one parameter named `ctx`.
5. The callback must not capture imports, props or declarations from the
   surrounding script. Pass server values through `state`; create browser-only
   values inside the callback.
6. `state` must be JSON-serializable: plain objects, arrays, strings, booleans,
   `null`, finite numbers. Vue refs are serialized as their current value.
   Functions, `undefined`, symbols, bigints, `NaN`/`Infinity`, `Date`, `Map` and
   circular references throw during SSR.
7. `ctx.load('specifier')` takes a string literal only. It compiles to a dynamic
   `import()` and is never evaluated during SSR.
8. Access context members directly (`ctx.signal`). Dynamic access such as
   `ctx[methodName]` is unsupported.

## Context API

| Member | Meaning |
| --- | --- |
| `ctx.root` | The component's root `HTMLElement` |
| `ctx.state` | Typed SSR snapshot of `options.state` (initial data, not a synced store) |
| `ctx.onCleanup(fn)` | Register cleanup for listeners, observers, timers |
| `ctx.signal(v)` | Writable signal: `s()` reads, `s(next)` writes |
| `ctx.computed(getter)` | Derived signal |
| `ctx.effect(fn)` | Runs now and when read signals change; auto-stopped on cleanup |
| `ctx.load(spec)` | Lazy browser-only `import()`, returns `Promise<TModule>` |

## Do / don't

- Do use `querySelector` with `data-*` attributes inside `ctx.root`.
- Do clean up everything you attach (`ctx.onCleanup`).
- Don't use Vue APIs (`ref`, `watch`, `onMounted`) inside the callback; it is not
  a Vue component at runtime. Use `ctx.signal` / `ctx.effect`.
- Don't reach for Drop when a component needs Vue reactivity, routing, or deep
  child components. Use normal hydrated Vue components there.
- `noScripts` (Nuxt's Vue client bundle) and `prerender` (Nitro HTML generation)
  are independent route options.

## Size budget

Core runtime is capped at 5 kB gzip. Reactivity is only injected into behaviors
that statically use `ctx.signal`, `ctx.computed` or `ctx.effect`.

## Working on this repository

```bash
npm install
npm run dev:prepare
npm run lint
npm run test
npm run test:types
```

`test/unit/readme.test.ts` asserts that the README documents the full API.
Keep it in sync when changing public behavior.
