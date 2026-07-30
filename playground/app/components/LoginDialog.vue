<template>
  <dialog data-dialog>
    <form
      method="dialog"
      data-form
    >
      <p>Войти как Ada Lovelace?</p>
      <button type="submit">
        Продолжить
      </button>
      <button
        type="button"
        data-close
      >
        Отмена
      </button>
    </form>
  </dialog>
</template>

<script setup lang="ts">
defineDrop({ state: {} }, async (ctx) => {
  const { session } = await (ctx.load('~~/shared/drop/session') as Promise<typeof import('~~/shared/drop/session')>)
  const dialog = ctx.root as HTMLDialogElement
  const form = ctx.root.querySelector<HTMLFormElement>('[data-form]')
  const close = ctx.root.querySelector<HTMLButtonElement>('[data-close]')

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

  ctx.onCleanup(() => document.removeEventListener('drop:login-request', open))
})
</script>
