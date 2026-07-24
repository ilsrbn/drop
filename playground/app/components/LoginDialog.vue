<template>
  <dialog data-dialog>
    <form method="dialog" data-form>
      <p>Войти как Ada Lovelace?</p>
      <button type="submit">Продолжить</button>
      <button type="button" data-close>Отмена</button>
    </form>
  </dialog>
</template>

<script setup lang="ts">
defineDropState({})
</script>

<drop lang="ts">
import { session } from "~~/shared/drop/session"

const { root, onCleanup } = useDropContext()
const dialog = root as HTMLDialogElement
const form = root.querySelector<HTMLFormElement>('[data-form]')
const close = root.querySelector<HTMLButtonElement>('[data-close]')

if (!form || !close) {
  throw new Error('LoginDialog markup is missing Drop targets')
}

const open = () => dialog.showModal()
document.addEventListener('drop:login-request', open)
close.addEventListener('click', () => dialog.close())
form.addEventListener('submit', async (event) => {
  event.preventDefault()
  const response = await fetch('/api/demo-login', { method: 'POST' })
  const { user } = await response.json()
  session.set(user)
  dialog.close()
})

onCleanup(() => document.removeEventListener('drop:login-request', open))
</drop>
