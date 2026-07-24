# Nuxt Drop — design

## Goal

Allow Nuxt pages to remain server-rendered HTML while sending browser JavaScript
only for components that explicitly opt in to Drop. A static route must not send
the Nuxt/Vue client renderer, hydration payload, or client router.

The design targets progressively enhanced, mostly-static sites. It is not a
replacement for Vue client components or a general SPA framework.

## Route contract

A page using Drop opts into Nuxt's native no-script route mode:

```ts
defineRouteRules({ noScripts: true, prerender: true })
```

Navigation is native MPA navigation: normal anchors and forms, a fresh SSR
document, and browser-managed history, focus, scrolling, and new-tab behavior.
Optional CSS cross-document View Transitions may enhance the navigation without
adding JavaScript. A client-side soft router is explicitly out of scope for the
core and may become a separate addon later.

## Authoring API

Drop behavior is declared inside an ordinary Vue SFC. There is no custom file
extension and no wrapper component at the call site.

```vue
<template>
  <header>
    <a href="/login" data-login-link :hidden="Boolean(user)">Войти</a>
    <span data-username :hidden="!user">{{ user?.username }}</span>
  </header>
</template>

<script setup lang="ts">
const { user } = defineProps<{ user: User | null }>()
defineDropState({ user })
</script>

<drop lang="ts">
import { ref, watchEffect } from "#drop/reactivity"
import { session } from "~/shared/drop/session"

const { root, state, onCleanup } = useDropContext<{ user: User | null }>()
const user = ref(state.user)

session.set(state.user)
const unsubscribe = session.subscribe(next => { user.value = next })
const stop = watchEffect(() => renderHeader(root, user.value))

onCleanup(() => {
  unsubscribe()
  stop()
})
</drop>
```

`<drop lang="ts">` is a Vue custom block transformed into a mount function and
runs once for each SSR instance of the component. Its top-level syntax is kept
compact and composition-oriented, but it is not Vue component setup running in
a browser.
Template event bindings such as `@click` do not work without hydration; browser
events are registered by Drop code.

## Server-to-browser data boundary

`defineDropState()` is a compiler macro allowed only in a component with a
`<drop>` block. It selects a JSON-serializable SSR snapshot for the
associated component instance.

It permits values prepared in normal server setup, including values from
`useAsyncData`, `ref`, and `computed`, but only as their current unwrapped
values. The browser does not receive live server refs, setup closures, Nuxt
composables, or the Nuxt payload. After mounting, interactive state belongs to
the Drop behavior or to an explicitly imported store.

Non-serializable values, circular references, and invalid special values must
produce build-time diagnostics rather than silently degrading data.

## Build and runtime model

For a `.vue` file with a Drop block, the module produces two independent
artifacts:

1. The normal Vue SFC template, server setup, and styles remain SSR artifacts.
2. The custom Drop block and browser-safe imports become a hashed ESM entry.

SSR adds a stable marker to the component's one real HTML root and emits the
instance's serialized state. The ESM entry finds all matching markers and
mounts itself once for each. Multiple instances load one entry. Vite may create
a shared chunk when several Drop entries import the same state module.

The component must have exactly one actual HTML root element in the initial
release. Fragments and a component as the root are rejected, avoiding an
invisible wrapper and an ambiguous mount target.

The minimal Drop runtime provides `useDropContext`, `onCleanup`, and store and
DOM utilities. It does not include a renderer, hydration, Nuxt application, or
router. `#drop/reactivity` is optional and provides tree-shakeable familiar
primitives (`ref`, `computed`, `watch`, `watchEffect`); components that do not
import it do not pay for reactivity.

## Shared state

Shared client state is opt-in:

```ts
import { createStore } from "#drop/state"

export const session = createStore<User | null>(null)
```

ES module caching makes the store singleton across Drop entries. The store is
not a mandatory application-level state manager. A component uses its SSR
snapshot to initialize a store only when that is useful, then subscribes and
updates its own DOM.

## Constraints and diagnostics

The module fails with actionable diagnostics for:

- multiple Drop blocks, missing template, invalid Drop root, or an invalid
  state snapshot;
- `defineDropState` used without a Drop block;
- a Drop-enabled component rendered on a route without `noScripts: true`;
- direct Drop imports of `vue`, `#app`, `#imports`, or `nuxt/*`.

The production build also validates the emitted Drop manifest so a static route
cannot accidentally depend on a Nuxt/Vue client entry through a transitive
import.

## Verification

Tests cover:

1. SFC parsing and diagnostics for custom blocks, root shape, forbidden imports,
   and serialization.
2. A production build where a static route has no Nuxt payload or client entry,
   but does include the used Drop asset; unused Drop entries do not load.
3. Browser E2E: a guest header renders from SSR; a login dialog posts to a mock
   Nuxt endpoint and updates the header in place without navigation.
4. Native link navigation to another static route, proving the next document
   mounts only its own Drop behaviors.
5. Cleanup behavior under development HMR and as a contract for a future
   optional soft-navigation addon.

## Out of scope for the first release

- implicit transfer of all `<script setup>` variables or live Vue refs;
- Vue template rendering in the browser;
- client-side routing and partial HTML swaps;
- a mandatory global store;
- custom file extensions or a custom language server.
