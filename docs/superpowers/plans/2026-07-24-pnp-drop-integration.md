# PNP Drop Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace PNP's manually injected Lenis scripts with a Drop behavior while retaining a no-Nuxt-client homepage.

**Architecture:** Make the Drop module installable from its Git repository and discover Drop SFC blocks anywhere below Nuxt's `srcDir`. PNP consumes the pinned Git dependency, mounts a Lenis behavior from `HeroSection.vue`, and no longer emits its two hand-maintained public scripts.

**Tech Stack:** Nuxt 4, Drop module, Vite, Lenis, Vitest, Nitro SSR build.

---

## Target file structure

| File | Responsibility |
|---|---|
| `nora/package.json` | Builds Drop when installed from a Git dependency. |
| `nora/src/build/build-drops.ts` | Finds Drop SFCs under all application directories. |
| `nora/test/unit/build-drops.test.ts` | Covers discovery of a behavior in `widgets/`. |
| `pnp/package.json` | Pins the Git dependency and keeps Lenis as a source dependency. |
| `pnp/nuxt.config.ts` | Registers Drop. |
| `pnp/app/app.vue` | Stops globally injecting Lenis scripts. |
| `pnp/app/widgets/hero/ui/HeroSection.vue` | Owns the SSR root and browser-only Lenis behavior. |
| `pnp/app/app-config.test.ts` | Asserts the new Drop contract and removal of hand-injected scripts. |
| `pnp/public/scripts/*` | Removed legacy Lenis copies. |

### Task 1: Make Drop consumable and discover PNP behaviors

**Files:**
- Modify: `nora/package.json`
- Modify: `nora/src/build/build-drops.ts`
- Create: `nora/test/unit/build-drops.test.ts`

- [ ] **Step 1: Write failing widget-discovery coverage**

```ts
it('builds a Drop behavior found below widgets', async () => {
  await writeFixture('widgets/hero/ui/HeroSection.vue', dropComponent)
  await buildDrops(options)
  expect(await readFile(join(outputDir, 'HeroSection.js'), 'utf8')).toContain('mountDropBehavior')
})
```

- [ ] **Step 2: Verify the test fails**

Run: `npx vitest run test/unit/build-drops.test.ts`

Expected: FAIL because the current glob only includes `components/**/*.vue`.

- [ ] **Step 3: Expand discovery and add Git-install preparation**

```ts
const files = await fg('**/*.vue', {
  cwd: srcDir,
  absolute: true,
  ignore: ['**/node_modules/**', '**/.nuxt/**'],
})
```

Add the package script:

```json
"prepare": "nuxt-module-build build"
```

- [ ] **Step 4: Verify module tests and build**

Run: `npm test && npm run dev:prepare && npm run test:types`

Expected: PASS.

- [ ] **Step 5: Commit and push the module update**

```bash
git add package.json package-lock.json src/build/build-drops.ts test/unit/build-drops.test.ts
git commit -m "feat: discover Drop behaviors across app source"
git push origin main
```

### Task 2: Replace PNP's global Lenis injection with a Drop behavior

**Files:**
- Modify: `pnp/package.json`
- Modify: `pnp/package-lock.json`
- Modify: `pnp/nuxt.config.ts`
- Modify: `pnp/app/app.vue`
- Modify: `pnp/app/widgets/hero/ui/HeroSection.vue`
- Modify: `pnp/app/app-config.test.ts`
- Delete: `pnp/public/scripts/lenis-init.js`
- Delete: `pnp/public/scripts/lenis.min.js`

- [ ] **Step 1: Write the failing PNP configuration assertions**

```ts
it('loads Lenis through Drop instead of global scripts', () => {
  expect(nuxtConfigSource).toContain('modules: [')
  expect(nuxtConfigSource).toContain('"drop"')
  expect(appSource).not.toContain('/scripts/lenis.min.js')
  expect(heroSource).toContain('<drop lang="ts">')
  expect(heroSource).toContain('import Lenis from "lenis"')
})
```

- [ ] **Step 2: Verify the test fails**

Run: `npm test -- app/app-config.test.ts`

Expected: FAIL because PNP still injects `/scripts/lenis.min.js` from `app.vue`.

- [ ] **Step 3: Install and configure Drop**

Add the pinned Git dependency to PNP, then run `npm install`. Add `"drop"` to `modules` in `nuxt.config.ts` and remove the `useHead({ script: ... })` call from `app/app.vue`.

- [ ] **Step 4: Add the Hero Drop behavior**

```vue
<script setup lang="ts">
defineDropState({})
</script>

<drop lang="ts">
import Lenis from "lenis"

const { onCleanup } = useDropContext()

if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const lenis = new Lenis({ autoRaf: true })
  onCleanup(() => lenis.destroy())
}
</drop>
```

Remove `public/scripts/lenis-init.js` and `public/scripts/lenis.min.js`.

- [ ] **Step 5: Verify PNP unit tests, types, and production build**

Run: `npm test && npm run typecheck && npm run build`

Expected: PASS and `/_drop/HeroSection.js` appears in the rendered home HTML.

- [ ] **Step 6: Commit the PNP migration**

```bash
git add package.json package-lock.json nuxt.config.ts app/app.vue app/widgets/hero/ui/HeroSection.vue app/app-config.test.ts public/scripts
git commit -m "feat: load Lenis through Drop behavior"
```

### Task 3: Verify the emitted browser graph

**Files:**
- Modify: `pnp/app/app-config.test.ts` if a focused SSR assertion is needed

- [ ] **Step 1: Start the built PNP server**

Run: `NITRO_HOST=127.0.0.1 NITRO_PORT=3030 node .output/server/index.mjs`

- [ ] **Step 2: Inspect the home document and Drop asset**

Run:

```bash
curl -sS http://127.0.0.1:3030/ | rg '/_drop/|/_nuxt/.*\\.js'
curl -sS http://127.0.0.1:3030/_drop/HeroSection.js | wc -c
```

Expected: home HTML has `/ _drop/HeroSection.js` (without the space) and no `/_nuxt/*.js`; the Drop asset is served successfully.

- [ ] **Step 3: Run final diff checks**

Run: `git diff --check && git status --short`

Expected: no whitespace errors; only intended PNP migration files are modified.
