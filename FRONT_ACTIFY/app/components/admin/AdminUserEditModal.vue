<template>
  <Teleport to="body">
    <div
      v-if="userId"
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-user-title"
      @click.self="close"
      @keyup.esc="close"
    >
      <div class="surface modal-box">
        <h3 id="edit-user-title" class="m-0 text-lg font-semibold">Modifier l'utilisateur</h3>
        <p class="mt-1 mb-0 text-muted text-xs">
          Identité uniquement — le wallet n'est pas modifiable ici.
        </p>

        <div v-if="loading" class="flex justify-center py-8">
          <span class="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        </div>

        <p v-else-if="loadError" class="text-danger text-sm mt-4" role="alert">{{ loadError }}</p>

        <form v-else class="flex flex-col gap-4 mt-5" @submit.prevent="submit">
          <div class="flex flex-col gap-1.5">
            <label for="edit-user-username" class="text-foreground text-sm font-medium">Username</label>
            <input
              id="edit-user-username"
              v-model.trim="form.username"
              type="text"
              pattern="[a-zA-Z0-9_]{3,32}"
              class="input"
            >
            <p class="text-muted text-xs">3 à 32 caractères : lettres, chiffres, underscore.</p>
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="edit-user-display-name" class="text-foreground text-sm font-medium">Nom affiché</label>
            <input id="edit-user-display-name" v-model.trim="form.displayName" type="text" maxlength="60" class="input">
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="edit-user-bio" class="text-foreground text-sm font-medium">Bio</label>
            <textarea
              id="edit-user-bio"
              v-model.trim="form.bio"
              rows="3"
              maxlength="500"
              class="input py-3 resize-none"
              style="min-height: 80px"
            />
            <p class="text-muted text-xs">{{ form.bio.length }}/500</p>
          </div>

          <p v-if="error" class="text-danger text-sm" role="alert">{{ error }}</p>

          <div class="flex gap-2.5 justify-end">
            <button class="ghost-btn text-sm" type="button" :disabled="saving" @click="close">Annuler</button>
            <button class="primary-btn text-sm px-5" type="submit" :disabled="saving">
              {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{ userId: string | null }>()
const emit = defineEmits<{ close: []; saved: [] }>()

const adminApi = useAdminApi()

const loading = ref(false)
const loadError = ref<string | null>(null)
const saving = ref(false)
const error = ref<string | null>(null)

const form = reactive({
  username: '',
  displayName: '',
  bio: '',
})

function close() {
  if (saving.value) return
  emit('close')
}

watch(() => props.userId, async (id) => {
  if (!id) return
  loading.value = true
  loadError.value = null
  error.value = null
  try {
    const user = await adminApi.getUser(id)
    form.username = user.username ?? ''
    form.displayName = user.displayName ?? ''
    form.bio = user.bio ?? ''
  } catch (e) {
    loadError.value = toApiError(e)?.message
      ?? (isNetworkError(e) ? 'Serveur injoignable, réessayez.' : "Impossible de charger l'utilisateur.")
  } finally {
    loading.value = false
  }
}, { immediate: true })

async function submit() {
  if (!props.userId) return
  saving.value = true
  error.value = null
  try {
    await adminApi.updateUser(props.userId, {
      username: form.username || null,
      displayName: form.displayName || null,
      bio: form.bio || null,
    })
    emit('saved')
  } catch (e) {
    error.value = toApiError(e)?.message
      ?? (isNetworkError(e) ? 'Serveur injoignable, réessayez.' : "Impossible d'enregistrer, réessayez.")
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  padding: 16px;
  overflow-y: auto;
}
.modal-box {
  width: min(480px, 100%);
  padding: 24px;
  max-height: 92vh;
  overflow-y: auto;
}
</style>
