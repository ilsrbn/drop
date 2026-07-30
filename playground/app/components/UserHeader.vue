<template>
  <header class="header">
    <a
      href="/"
      class="brand"
    >Drop</a>
    <a
      href="/login"
      data-login
      :hidden="Boolean(user)"
    >Войти</a>
    <span
      data-username
      :hidden="!user"
    >{{ user?.username }}</span>
  </header>
</template>

<script setup lang="ts">
import type { User } from '~~/shared/drop/session'

const { user } = defineProps<{ user: User | null }>()

defineDrop({ state: { user } }, async (ctx) => {
  const { session } = await (ctx.load('~~/shared/drop/session') as Promise<typeof import('~~/shared/drop/session')>)
  const login = ctx.root.querySelector<HTMLAnchorElement>('[data-login]')
  const username = ctx.root.querySelector<HTMLSpanElement>('[data-username]')

  if (!login || !username) {
    throw new Error('UserHeader markup is missing Drop targets')
  }

  session.set(ctx.state.user)
  const unsubscribe = session.subscribe((user) => {
    login.hidden = Boolean(user)
    username.hidden = !user
    username.textContent = user?.username ?? ''
  })

  const controller = new AbortController()
  login.addEventListener('click', (event) => {
    event.preventDefault()
    document.dispatchEvent(new CustomEvent('drop:login-request'))
  }, { signal: controller.signal })

  ctx.onCleanup(() => {
    controller.abort()
    unsubscribe()
  })
})
</script>

<style scoped>
.header { display: flex; justify-content: space-between; gap: 1rem; padding: 1rem; }
.brand { margin-right: auto; }
</style>
