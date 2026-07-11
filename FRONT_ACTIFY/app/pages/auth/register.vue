<template>
  <div class="min-h-screen flex flex-col items-center justify-center px-4">
    <div class="surface w-full max-w-md p-8 flex flex-col gap-6">
      <div class="text-center">
        <h1 class="ethnocentric text-foreground text-xl">Bienvenue sur Actify</h1>
        <p class="text-muted text-sm mt-2">
          Votre wallet est vérifié — encore quelques informations pour finaliser votre compte.
        </p>
      </div>

      <div
        v-if="walletAddress"
        class="flex items-center gap-3 rounded-xl border border-white/10 bg-panel-3 px-4 py-3"
      >
        <Icon name="ph:wallet" class="text-accent text-lg shrink-0" />
        <div class="min-w-0">
          <p class="text-muted text-xs uppercase tracking-widest">Wallet connecté</p>
          <p class="text-foreground text-sm font-mono truncate">{{ walletAddress }}</p>
        </div>
        <Icon name="ph:check-circle" class="text-green-400 text-lg ml-auto shrink-0" />
      </div>

      <form class="flex flex-col gap-4" @submit.prevent="submit">
        <div class="flex flex-col gap-1.5">
          <label for="username" class="text-foreground text-sm font-medium">
            Username <span class="text-red-400">*</span>
          </label>
          <input
            id="username"
            v-model.trim="form.username"
            type="text"
            required
            pattern="[a-zA-Z0-9_]{3,32}"
            placeholder="ex : yohan_77"
            class="h-11 rounded-xl border border-white/10 bg-panel-3 px-4 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
          >
          <p class="text-muted text-xs">3 à 32 caractères : lettres, chiffres, underscore.</p>
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="displayName" class="text-foreground text-sm font-medium">Nom affiché</label>
          <input
            id="displayName"
            v-model.trim="form.displayName"
            type="text"
            maxlength="60"
            placeholder="ex : Yohan G."
            class="h-11 rounded-xl border border-white/10 bg-panel-3 px-4 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
          >
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="bio" class="text-foreground text-sm font-medium">Bio</label>
          <textarea
            id="bio"
            v-model.trim="form.bio"
            rows="3"
            maxlength="500"
            placeholder="Parlez de vos créations..."
            class="rounded-xl border border-white/10 bg-panel-3 px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none resize-none"
          />
        </div>

        <p v-if="error" class="text-red-400 text-xs" role="alert">{{ error }}</p>

        <button type="submit" class="primary-btn h-11" :disabled="saving">
          <span v-if="!saving">Créer mon compte</span>
          <span v-else class="flex items-center justify-center gap-2">
            <span class="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            Enregistrement...
          </span>
        </button>
      </form>

      <NuxtLink to="/profile" class="text-muted text-xs text-center hover:text-foreground hover:underline">
        Compléter plus tard
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MeProfile } from '~/types/auth'

definePageMeta({ layout: 'auth', middleware: 'auth' })

useHead({ title: 'Créer mon compte' })

const store = useAuthStore()
const api = useApi()
const { fetchMe } = useAuth()

const walletAddress = computed(() => {
  const wallets = store.user?.wallets ?? []
  return (wallets.find(w => w.isPrimary) ?? wallets[0])?.address ?? null
})

const form = reactive({
  username: store.user?.username ?? '',
  displayName: store.user?.displayName ?? '',
  bio: store.user?.bio ?? '',
})

const saving = ref(false)
const error = ref<string | null>(null)

async function submit() {
  saving.value = true
  error.value = null
  try {
    // PUT /users/me returns the profile without `stats` — refetch the full
    // shape rather than storing a partial one.
    await api.put<MeProfile>('/users/me', {
      username: form.username,
      displayName: form.displayName || null,
      bio: form.bio || null,
    })
    await fetchMe()
    await navigateTo('/profile')
  } catch (err) {
    error.value = toApiError(err)?.message ?? 'Impossible d\'enregistrer votre profil, réessayez.'
  } finally {
    saving.value = false
  }
}
</script>
