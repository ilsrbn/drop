<script setup lang="ts">
defineDropState({ count: 1 })
</script>

<template>
  <div />
</template>

<drop lang="ts">
const state = useDropContext<{ count: number }>()
state.count++
</drop>
