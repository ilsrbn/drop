<template>
  <aside>Packaged Drop</aside>
</template>

<script setup lang="ts">
defineDropState({ enabled: true })
</script>

<drop lang="ts">
const { root } = useDropContext()
root.dataset.ready = 'true'
</drop>
