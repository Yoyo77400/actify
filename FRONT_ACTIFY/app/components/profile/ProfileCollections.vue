<template>
  <section>
    <div class="flex items-center justify-between gap-4 mb-3">
      <CommonSectionHeader title="Mes collections" subtitle="Regroupez vos assets par univers" class="mb-0" />
      <button type="button" class="secondary-btn text-sm shrink-0" @click="startCreate">
        <Icon name="ph:plus" class="text-base" />
        Nouvelle collection
      </button>
    </div>

    <p v-if="error" class="text-danger text-sm mb-3" role="alert">{{ error }}</p>

    <!-- Inline create/rename form: a whole modal would be overkill for one field. -->
    <form v-if="editing !== null" class="surface p-4 flex gap-2 items-start mb-4" @submit.prevent="submit">
      <div class="flex-1 flex flex-col gap-1.5">
        <input
          ref="nameInput"
          v-model.trim="name"
          class="input"
          placeholder="ex : Neon Dreams"
          maxlength="100"
          required
        >
        <p class="text-muted text-xs">2 à 100 caractères. Le nom doit être unique.</p>
      </div>
      <div class="flex flex-col gap-1.5">
        <label class="cover-picker" :class="busy ? 'pointer-events-none opacity-60' : ''">
          <img :src="coverPreview" alt="" class="w-full h-full object-cover">
          <span class="picker-hint">
            <Icon name="ph:image" class="text-base" />
          </span>
          <input type="file" accept="image/*" class="sr-only" @change="onCoverPick">
        </label>
        <p class="text-muted text-xs text-center">Couverture</p>
      </div>
      <button type="submit" class="primary-btn text-sm" :disabled="busy">
        {{ editing === 0 ? 'Créer' : 'Renommer' }}
      </button>
      <button type="button" class="ghost-btn text-sm" :disabled="busy" @click="cancel">Annuler</button>
    </form>

    <div v-if="collections.length" class="grid grid-cols-3 max-lg:grid-cols-2 max-md:grid-cols-1 gap-4">
      <div v-for="col in collections" :key="col.id" class="surface overflow-hidden flex flex-col">
        <NuxtLink :to="`/collections/${col.slug}`">
          <img
            :src="bannerImage(col.img, col.slug)"
            :alt="col.name"
            class="w-full h-[130px] object-cover bg-panel-3"
            loading="lazy"
          >
        </NuxtLink>
        <div class="p-3.5 flex-1 flex flex-col gap-2">
          <div>
            <NuxtLink :to="`/collections/${col.slug}`" class="ethnocentric text-base line-clamp-1 hover:underline">
              {{ col.name }}
            </NuxtLink>
            <p class="mt-1 mb-0 text-muted text-xs">
              {{ col.listingCount }} {{ col.listingCount > 1 ? 'assets' : 'asset' }}
            </p>
          </div>
          <div class="flex gap-2 mt-auto">
            <button type="button" class="ghost-btn text-xs px-3" @click="startRename(col)">Renommer</button>
            <button
              type="button"
              class="ghost-btn text-xs px-3 text-danger border-danger/30 hover:bg-danger/10"
              :disabled="busy"
              @click="confirmRemove(col)"
            >
              {{ pendingDelete === col.id ? 'Confirmer ?' : 'Supprimer' }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <div v-else-if="editing === null" class="surface p-8 text-center">
      <p class="text-muted text-sm">Aucune collection pour le moment.</p>
      <button type="button" class="text-accent text-sm hover:underline" @click="startCreate">
        Créer ma première collection
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { Collection } from '~/types/collection'

const collectionsApi = useCollections()

const { data, refresh } = await useAsyncData('my-collections', () => collectionsApi.mine())
const collections = computed(() => data.value ?? [])

// null = form closed, 0 = creating, >0 = renaming that id.
const editing = ref<number | null>(null)
const name = ref('')
const busy = ref(false)
const error = ref<string | null>(null)
const pendingDelete = ref<number | null>(null)
const nameInput = useTemplateRef<HTMLInputElement>('nameInput')

// Couverture choisie mais pas encore envoyée : à la création, la collection
// n'existe pas encore, donc l'upload ne peut avoir lieu qu'après. Annuler le
// formulaire ne doit rien laisser derrière.
const pendingCover = ref<File | null>(null)
const coverObjectUrl = ref<string | null>(null)
const editingCollection = computed(() => collections.value.find(c => c.id === editing.value) ?? null)
const coverPreview = computed(() =>
  coverObjectUrl.value ?? bannerImage(editingCollection.value?.img, editingCollection.value?.slug ?? 'new'),
)

function revokeCover() {
  if (coverObjectUrl.value) URL.revokeObjectURL(coverObjectUrl.value)
  coverObjectUrl.value = null
  pendingCover.value = null
}

function onCoverPick(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  pendingCover.value = file
  if (coverObjectUrl.value) URL.revokeObjectURL(coverObjectUrl.value)
  coverObjectUrl.value = URL.createObjectURL(file)
}

function open(id: number, initial: string) {
  editing.value = id
  name.value = initial
  error.value = null
  pendingDelete.value = null
  revokeCover()
  nextTick(() => nameInput.value?.focus())
}

const startCreate = () => open(0, '')
const startRename = (col: Collection) => open(col.id, col.name)

function cancel() {
  editing.value = null
  name.value = ''
  error.value = null
  revokeCover()
}

async function submit() {
  if (editing.value === null) return
  busy.value = true
  error.value = null
  try {
    // La couverture part APRÈS : à la création, l'id n'existe pas avant.
    const saved = editing.value === 0
      ? await collectionsApi.create(name.value)
      : await collectionsApi.rename(editing.value, name.value)
    if (pendingCover.value) {
      await collectionsApi.uploadImage(saved.id, pendingCover.value)
    }
    await refresh()
    cancel()
  } catch (e) {
    error.value = toApiError(e)?.message ?? 'Impossible d\'enregistrer cette collection.'
  } finally {
    busy.value = false
  }
}

// Two-step delete: the first click arms it, the second confirms. Deleting only
// removes the grouping — the assets inside are detached, never destroyed.
async function confirmRemove(col: Collection) {
  if (pendingDelete.value !== col.id) {
    pendingDelete.value = col.id
    return
  }
  busy.value = true
  error.value = null
  try {
    await collectionsApi.remove(col.id)
    await refresh()
  } catch (e) {
    error.value = toApiError(e)?.message ?? 'La suppression a échoué.'
  } finally {
    busy.value = false
    pendingDelete.value = null
  }
}

onBeforeUnmount(revokeCover)
</script>

<style scoped>
/* Même principe que les images de profil : le <label> englobe un input masqué,
   donc l'aperçu entier est cliquable et reste accessible au clavier. */
.cover-picker {
  position: relative;
  display: block;
  width: 96px;
  height: 56px;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid var(--color-line);
}
.picker-hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: rgba(0, 0, 0, 0.45);
  opacity: 0;
  transition: opacity 0.18s ease;
}
.cover-picker:hover .picker-hint,
.cover-picker:focus-within .picker-hint { opacity: 1; }
</style>
