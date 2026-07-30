<template>
  <aside>Widget</aside>
</template>

<script setup lang="ts">
defineDrop({ state: { enabled: true } }, (ctx) => {
  ctx.root.dataset.ready = 'true'
})
</script>
