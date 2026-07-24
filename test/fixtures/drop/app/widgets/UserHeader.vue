<template>
  <aside>Widget header</aside>
</template>

<script setup lang="ts">
defineDropState({ user: null })
</script>

<drop lang="ts">
const { root } = useDropContext()
root.dataset.ready = 'true'
</drop>
