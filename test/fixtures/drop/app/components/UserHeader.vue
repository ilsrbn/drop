<template>
  <header>Guest</header>
</template>

<script setup lang="ts">
const user = null

defineDrop({ state: { user } }, (ctx) => {
  ctx.root.dataset.ready = 'true'
})
</script>
