<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-profile-title"
      @click.self="close"
      @keyup.esc="close"
    >
      <div class="surface modal-box">
        <h3 id="edit-profile-title" class="m-0 text-lg font-semibold">Modifier mon profil</h3>

        <form class="flex flex-col gap-5 mt-5" @submit.prevent="submit">
          <!-- Banner + avatar previews double as their file pickers. -->
          <div class="flex flex-col gap-2">
            <span class="text-foreground text-sm font-medium">Bannière</span>
            <label class="banner-picker" :class="busy ? 'pointer-events-none opacity-60' : ''">
              <img :src="bannerPreview" alt="" class="w-full h-full object-cover">
              <span class="picker-hint">
                <Icon name="ph:image" class="text-lg" />
                Changer la bannière
              </span>
              <input type="file" accept="image/*" class="sr-only" @change="onBannerPick">
            </label>
          </div>

          <div class="flex items-center gap-4">
            <label class="avatar-picker shrink-0" :class="busy ? 'pointer-events-none opacity-60' : ''">
              <img :src="avatarPreview" alt="" class="w-full h-full object-cover rounded-full">
              <span class="picker-hint picker-hint--round">
                <Icon name="ph:camera" class="text-lg" />
              </span>
              <input type="file" accept="image/*" class="sr-only" @change="onAvatarPick">
            </label>
            <p class="text-muted text-xs">
              Images PNG, JPEG, WebP, GIF ou AVIF — 50 Mo maximum.
              Rien n'est enregistré tant que vous n'avez pas validé.
            </p>
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="edit-username" class="text-foreground text-sm font-medium">
              Username <span class="text-danger">*</span>
            </label>
            <input
              id="edit-username"
              v-model.trim="form.username"
              type="text"
              required
              pattern="[a-zA-Z0-9_]{3,32}"
              class="input"
            >
            <p class="text-muted text-xs">3 à 32 caractères : lettres, chiffres, underscore.</p>
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="edit-display-name" class="text-foreground text-sm font-medium">Nom affiché</label>
            <input id="edit-display-name" v-model.trim="form.displayName" type="text" maxlength="60" class="input">
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="edit-bio" class="text-foreground text-sm font-medium">Bio</label>
            <textarea
              id="edit-bio"
              v-model.trim="form.bio"
              rows="3"
              maxlength="500"
              class="input py-3 resize-none"
              style="min-height: 84px"
            />
            <p class="text-muted text-xs">{{ form.bio.length }}/500</p>
          </div>

          <p v-if="error" class="text-danger text-sm" role="alert">{{ error }}</p>

          <div class="flex gap-2.5 justify-end">
            <button class="ghost-btn text-sm" type="button" :disabled="busy" @click="close">Annuler</button>
            <button class="primary-btn text-sm px-5" type="submit" :disabled="busy">
              {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const open = defineModel<boolean>({ required: true })

const { user, fetchMe } = useAuth()
const profile = useProfile()

const form = reactive({ username: '', displayName: '', bio: '' })
const saving = ref(false)
const busy = computed(() => saving.value)
const error = ref<string | null>(null)

// Picked but NOT yet sent. Nothing in this modal touches the server before
// "Enregistrer", so Cancel genuinely discards everything — uploading on pick
// made a cancelled edit keep the new image.
const pendingAvatar = ref<File | null>(null)
const pendingBanner = ref<File | null>(null)

// Preview of the pending pick. Object URLs are revoked on replacement/close so
// a long editing session doesn't leak blobs.
const avatarObjectUrl = ref<string | null>(null)
const bannerObjectUrl = ref<string | null>(null)

const avatarPreview = computed(() =>
  avatarObjectUrl.value ?? avatarImage(user.value?.avatarCid, user.value?.id ?? 'me'),
)
const bannerPreview = computed(() =>
  bannerObjectUrl.value ?? bannerImage(user.value?.bannerCid, user.value?.id ?? 'me'),
)

function revoke(url: Ref<string | null>) {
  if (url.value) URL.revokeObjectURL(url.value)
  url.value = null
}

// Refill from the store each time the modal opens: a cancelled edit must not
// survive into the next one.
function discardPending() {
  pendingAvatar.value = null
  pendingBanner.value = null
  revoke(avatarObjectUrl)
  revoke(bannerObjectUrl)
}

watch(open, (isOpen) => {
  if (!isOpen) return
  form.username = user.value?.username ?? ''
  form.displayName = user.value?.displayName ?? ''
  form.bio = user.value?.bio ?? ''
  error.value = null
  discardPending()
}, { immediate: true })

function close() {
  if (busy.value) return
  discardPending()
  open.value = false
}

function onAvatarPick(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  pendingAvatar.value = file
  revoke(avatarObjectUrl)
  avatarObjectUrl.value = URL.createObjectURL(file)
}

function onBannerPick(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  pendingBanner.value = file
  revoke(bannerObjectUrl)
  bannerObjectUrl.value = URL.createObjectURL(file)
}

async function submit() {
  saving.value = true
  error.value = null
  try {
    // Images first: each has its own endpoint, and the profile PUT would
    // otherwise report success while the pictures silently failed.
    if (pendingBanner.value) await profile.uploadBanner(pendingBanner.value)
    if (pendingAvatar.value) await profile.uploadAvatar(pendingAvatar.value)

    await profile.update({
      username: form.username,
      displayName: form.displayName || null,
      bio: form.bio || null,
    })
    // PUT /users/me answers without `stats`; refetch rather than store a partial.
    await fetchMe()
    discardPending()
    open.value = false
  } catch (e) {
    error.value = toApiError(e)?.message
      ?? (isNetworkError(e) ? 'Serveur injoignable, réessayez.' : 'Impossible d\'enregistrer votre profil, réessayez.')
  } finally {
    saving.value = false
  }
}

onBeforeUnmount(() => {
  revoke(avatarObjectUrl)
  revoke(bannerObjectUrl)
})
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
  width: min(520px, 100%);
  padding: 24px;
  max-height: 92vh;
  overflow-y: auto;
}

/* Both pickers are <label>s wrapping a visually-hidden input: the whole
   preview is the click target, and it stays keyboard-reachable. */
.banner-picker,
.avatar-picker {
  position: relative;
  display: block;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid var(--color-line);
}
.banner-picker {
  height: 120px;
  border-radius: 12px;
}
.avatar-picker {
  width: 72px;
  height: 72px;
  border-radius: 9999px;
}

.picker-hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 13px;
  color: #fff;
  background: rgba(0, 0, 0, 0.45);
  opacity: 0;
  transition: opacity 0.18s ease;
}
.banner-picker:hover .picker-hint,
.avatar-picker:hover .picker-hint,
.banner-picker:focus-within .picker-hint,
.avatar-picker:focus-within .picker-hint {
  opacity: 1;
}
.picker-hint--round {
  border-radius: 9999px;
}
</style>
