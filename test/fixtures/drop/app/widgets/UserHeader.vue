<template>
  <aside>Widget header</aside>
</template>

<script setup lang="ts">
defineDrop({ state: { user: null } }, (ctx) => {
  ctx.root.dataset.ready = 'true'
})
</script>
