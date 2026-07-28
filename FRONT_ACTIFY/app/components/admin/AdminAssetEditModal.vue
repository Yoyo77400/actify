<template>
  <Teleport to="body">
    <div
      v-if="assetId"
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-asset-title"
      @click.self="close"
      @keyup.esc="close"
    >
      <div class="surface modal-box">
        <h3 id="edit-asset-title" class="m-0 text-lg font-semibold">Modifier l'asset</h3>
        <p class="mt-1 mb-0 text-muted text-xs">
          Seules les informations hors-chaîne sont modifiables — le NFT déjà minté reste inchangé.
        </p>

        <div v-if="loading" class="flex justify-center py-8">
          <span class="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        </div>

        <p v-else-if="loadError" class="text-danger text-sm mt-4" role="alert">{{ loadError }}</p>

        <AssetEditForm
          v-else-if="loadedAsset"
          :show-collection="false"
          class="mt-5"
          :initial="loadedAsset"
          :saving="saving"
          :error="error"
          @submit="onSubmit"
          @cancel="close"
        />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { AssetCard, UpdateAssetBody } from '~/types/asset'

const props = defineProps<{ assetId: string | null }>()
const emit = defineEmits<{ close: []; saved: [] }>()

const adminApi = useAdminApi()

const loading = ref(false)
const loadError = ref<string | null>(null)
const loadedAsset = ref<AssetCard | null>(null)
const saving = ref(false)
const error = ref<string | null>(null)

function close() {
  if (saving.value) return
  emit('close')
}

watch(() => props.assetId, async (id) => {
  if (!id) return
  loading.value = true
  loadError.value = null
  error.value = null
  loadedAsset.value = null
  try {
    loadedAsset.value = await adminApi.getAsset(id)
  } catch (e) {
    loadError.value = toApiError(e)?.message
      ?? (isNetworkError(e) ? 'Serveur injoignable, réessayez.' : "Impossible de charger l'asset.")
  } finally {
    loading.value = false
  }
}, { immediate: true })

async function onSubmit(payload: UpdateAssetBody) {
  if (!props.assetId) return
  saving.value = true
  error.value = null
  try {
    await adminApi.updateAsset(props.assetId, payload)
    emit('saved')
  } catch (e) {
    error.value = toApiError(e)?.message
      ?? (isNetworkError(e) ? 'Serveur injoignable, réessayez.' : "Impossible d'enregistrer l'asset, réessayez.")
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
  width: min(560px, 100%);
  padding: 24px;
  max-height: 92vh;
  overflow-y: auto;
}
</style>
