<template>
  <header>Guest</header>
</template>

<script setup lang="ts">
const user = null

defineDropState({ user })
</script>

<script drop lang="ts">
const { root } = useDropContext()
root.dataset.ready = 'true'
</script>
