# Drop README API reference design

## Goal

Rewrite the project README in English as the single, practical reference for
the published Drop module API. It must describe the behavior that exists in the
current implementation without relying on obsolete custom-block terminology or
artificial negative phrasing.

## Audience

Nuxt developers who need small client-side behavior for server-rendered markup,
especially routes that omit Nuxt's client scripts.

## Document structure

1. Introduce Drop, its SSR-first model, and the independent browser entry it
   generates for each behavior.
2. Show installation and Nuxt module registration.
3. Include one complete component example using `defineDrop`, SSR state,
   native DOM events, an effect, and listener cleanup.
4. Document `defineDrop(options, behavior)`: its compile-time nature, both
   arguments, its return value, supported callback form, and browser boundary.
5. Document every `DropContext` member: `root`, `state`, `onCleanup`,
   `signal`, `computed`, `effect`, and `load`, including return values and
   cleanup behavior where applicable.
6. Explain state serialization and the values rejected during SSR.
7. Explain component and compiler requirements, including the single native
   root, one top-level macro call, prohibited callback captures, and literal
   `ctx.load` specifiers. List exact diagnostics where they are stable.
8. Explain Nuxt integration: `noScripts` prevents Vue hydration scripts and
   `prerender` controls HTML generation independently.
9. State the production runtime budget and list development commands.

## Writing rules

- Use direct, affirmative technical language.
- Describe limitations only where they define the API contract or prevent an
  invalid integration.
- Do not mention retired authoring mechanisms as a framing device.
- Keep examples valid TypeScript and consistent with the implementation.

## Verification

Run the focused README test and lint after the README edit. The README test
must continue to cover the macro API, route options, runtime-size budget, and
development command references.
