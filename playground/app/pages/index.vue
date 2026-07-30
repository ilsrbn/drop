<template>
  <main>
    <UserHeader :user="user" />
    <LoginDialog />
    <section>
      <h1>Drop playground</h1>
      <p>Эта страница отдана Nuxt как SSR HTML. В браузер загружаются только два Drop behavior bundles.</p>
    </section>
  </main>
</template>

<script setup lang="ts">
import type { User } from '~~/shared/drop/session'

defineOptions({ name: 'DropPlayground' })

const { data } = await useFetch<{ user: User | null }>('/api/demo-session')
const user = computed(() => data.value?.user ?? null)
</script>
