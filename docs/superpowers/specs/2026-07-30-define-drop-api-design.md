# Drop macro API design

## Goal

Replace the `<drop>` Vue custom block with one compiler macro in the component's
ordinary `<script setup>` block:

```vue
<script setup lang="ts">
const props = defineProps<{ initiallyOpen: boolean }>()

defineDrop({ state: { initiallyOpen: props.initiallyOpen } }, (ctx) => {
  const button = ctx.root.querySelector<HTMLButtonElement>('[data-toggle]')

  if (!button) {
    throw new Error('Expected [data-toggle]')
  }

  const toggle = () => {
    ctx.root.classList.toggle('is-open')
  }

  button.addEventListener('click', toggle)
  ctx.onCleanup(() => button.removeEventListener('click', toggle))
})
</script>
```

The result preserves Drop's current runtime model: server-rendered HTML is kept
intact, and the behavior becomes a separate browser entry. The authoring model,
however, is normal TypeScript rather than a Vue custom block.

## Public API

### `defineDrop(options, behavior)`

`defineDrop` is a compile-time macro that accepts an options object and exactly
one inline arrow or function expression:

```ts
defineDrop({ state: { open: false } }, (ctx) => {
  // browser-only behavior
})
```

`options.state` is evaluated during SSR and must be a JSON-serializable object.
It becomes `ctx.state` in the browser behavior. Refs are serialized as their
values; functions, class instances, `undefined`, non-finite numbers, and
circular values are rejected during SSR.

`ctx` is typed as `DropContext<TState>` and contains:

- `root`: the component's native HTML root element;
- `state`: the snapshot from `options.state`;
- `onCleanup(fn)`: registers teardown for navigation, replacement, and HMR;
- `signal(value)`, `computed(fn)`, and `effect(fn)`: optional minimal reactive primitives;
- `load(specifier)`: loads an external browser module from a string literal.

The context is deliberately small. DOM lookup, event registration, attributes,
classes, text, and form values use the native platform APIs. `ctx` must not grow
into a general DOM utility namespace.

The behavior may also return a cleanup function. It is registered in the same
cleanup scope.

### Vue-like reactivity, native DOM

Drop does not hydrate Vue templates, so Vue directives such as `v-model`,
`v-show`, `:class`, and `{{ value }}` cannot work at runtime. Behavior uses the
native DOM, with signals and effects offered for familiar reactive state:

```vue
<template>
  <section>
    <button data-toggle type="button">Toggle</button>
    <p data-message>Ready</p>
  </section>
</template>

<script setup lang="ts">
defineDrop({ state: {} }, (ctx) => {
  const toggle = ctx.root.querySelector<HTMLButtonElement>('[data-toggle]')
  const message = ctx.root.querySelector<HTMLElement>('[data-message]')
  if (!toggle || !message) throw new Error('Expected Drop targets')

  const open = ctx.signal(false)

  ctx.effect(() => {
    ctx.root.classList.toggle('is-open', open())
    message.hidden = !open()
    message.textContent = open() ? 'Open' : 'Closed'
  })

  const handleClick = () => { open(!open()) }
  toggle.addEventListener('click', handleClick)
  ctx.onCleanup(() => toggle.removeEventListener('click', handleClick))
})
</script>
```

`ctx.effect` is disposed automatically with the behavior. No Drop directive
syntax, template refs, models, selector helpers, or DOM-binding helpers are
provided.

### No-import authoring and selective runtime injection

Drop behavior code must not require imports from Drop packages. All public
behavior APIs are accessed through `ctx`: `root`, `state`, `onCleanup`,
`signal`, `computed`, `effect`, and `load`.

Thus a behavior has no Drop imports:

```ts
defineDrop({ state: {} }, (ctx) => {
  const toggle = () => {
    ctx.root.classList.toggle('is-open')
  }

  ctx.root.addEventListener('click', toggle)
  ctx.onCleanup(() => ctx.root.removeEventListener('click', toggle))
})
```

To preserve tree-shaking, the compiler analyses static `ctx.property` accesses
inside the callback and injects only the used helpers into the generated entry.
For example, a behavior using only `ctx.root` and `ctx.onCleanup` includes no
reactivity code. Dynamic access such as
`ctx[methodName]` is prohibited because it would make this analysis ambiguous.

The generated implementation may import internal runtime modules, but those
imports are never written by an application author. Drop's public authoring API
has zero required imports.

## Runtime-size budget

The core runtime loaded by every Drop behavior, including mounting, state
parsing, and cleanup, must be at most **5 kB gzip**.

The compiler injects reactivity selectively. A behavior that only attaches a
listener must not include reactive code. Shared dependencies may be emitted as
shared chunks when that reduces total route cost, but the per-behavior cost
remains visible in build inspection.

CI must enforce the budget against a production fixture with the core-only API
and report the compressed sizes of core, optional helpers, and emitted behavior
entries.

## Component contract

A Drop component has exactly:

- one `<template>` with one native HTML root element;
- one `<script setup>` containing one `defineDrop({ state }, behavior)` call.

`defineDrop` must be at the top level of `<script setup>`; conditionally
declaring behavior is not supported. The component continues to work best on routes with `noScripts:
true`, though Drop itself does not require that route rule.

## Compilation and isolation

The transform removes `defineDrop(...)` from the Vue source and emits its
callback as the component's independent `/_drop/<behavior-id>.js` entry. The
transform also keeps the existing root annotations and SSR state serialization.
The callback executes only after its matching HTML root exists in the document.

The callback is a browser boundary, not a closure over `<script setup>`.
Therefore it must not capture local values, props, imports, or declarations
from the surrounding script:

```ts
const props = defineProps<{ initiallyOpen: boolean }>()
const selector = '[data-toggle]'

// Invalid: `selector` belongs to the surrounding SFC scope.
defineDrop({ state: { initiallyOpen: props.initiallyOpen } }, () => document.querySelector(selector))

// Valid: state crosses the SSR/browser boundary explicitly.
defineDrop({ state: { initiallyOpen: props.initiallyOpen } }, (ctx) => console.log(ctx.state.initiallyOpen))
```

Browser dependencies are loaded without author-written imports:

```ts
defineDrop({ state: {} }, async (ctx) => {
  const { default: Lenis } = await ctx.load('lenis')
  const { createSession } = await ctx.load('~/shared/drop/session')
})
```

`ctx.load(specifier)` accepts only a string literal. The compiler transforms it
to a bundled dynamic import in the generated browser entry, so it never runs in
SSR. The helper itself adds no runtime code. Non-literal specifiers are rejected
to keep bundling deterministic.

## Diagnostics

Errors should point to the relevant macro call and state the remedy:

- `a component can contain only one defineDrop call`;
- `defineDrop requires an options object and one inline function`;
- `defineDrop options.state must be an object`;
- `defineDrop cannot capture "selector"; pass server values through options.state or declare browser-only values inside the callback`;
- `ctx.load requires a string-literal module specifier`;
- `a Drop component requires one HTML root element`.

Because behavior code is standard TypeScript inside `<script setup>`, Volar,
TypeScript, ESLint, and Prettier should operate on it without custom-block
extraction or source mappings. Drop-specific checking is limited to macro
arguments, capture analysis, and `ctx.load` specifiers.

## Non-goals

- Capturing arbitrary `<script setup>` variables in the behavior.
- Making Vue template handlers work on `noScripts` routes.
- Adding Vue component lifecycle semantics to Drop.
- Supporting multiple Drop behaviors per component in this iteration.

## Verification

Tests must cover macro extraction, state serialization, `ctx.load` extraction,
invalid captures, cleanup, SSR output, and a
client mount on a `noScripts` route. Language-tooling tests must verify that a
`defineDrop` callback receives normal TypeScript diagnostics at its original
source locations. Runtime-size tests must prevent the core gzip size from
exceeding 5 kB and confirm that unused DOM helpers are absent from a core-only
entry.
