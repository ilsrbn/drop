---
name: drop
description: Use when adding small client-side behavior (toggles, dialogs, session-aware UI) to a Nuxt page that is server-rendered or static, especially on routes with noScripts, or when a project uses the @ilsrbn/drop module or the defineDrop macro.
---

# Writing Drop behaviors in Nuxt

Drop (`@ilsrbn/drop`) attaches a small browser-only behavior to a component's
root element on server-rendered Nuxt markup, without Vue hydration.

Read `AGENTS.md` in the package root (or the README) for the full rules. The
essentials:

1. One `<template>` with one native HTML root element.
2. One top-level `defineDrop({ state }, (ctx) => { ... })` in `<script setup>`.
3. The callback is an inline function with exactly one parameter named `ctx`
   and cannot capture props, imports or script variables. Pass server values
   through `state` (JSON-serializable only).
4. In the callback use `ctx.root`, `ctx.state`, `ctx.signal`, `ctx.computed`,
   `ctx.effect`, `ctx.load('literal-specifier')` and `ctx.onCleanup`. Do not use
   Vue APIs there.
5. Query DOM with `data-*` attributes and always register cleanup.

If a component needs real Vue reactivity or child components, do not use Drop:
use a normal hydrated component.
