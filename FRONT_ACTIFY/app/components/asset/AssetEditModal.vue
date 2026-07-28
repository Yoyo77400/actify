<template>
  <Teleport to="body">
    <div
      v-if="asset"
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-my-asset-title"
      @click.self="close"
      @keyup.esc="close"
    >
      <div class="surface modal-box">
        <h3 id="edit-my-asset-title" class="m-0 text-lg font-semibold">Modifier mon asset</h3>
        <p class="mt-1 mb-0 text-muted text-xs">
          Seules les informations hors-chaîne sont modifiables — le NFT déjà minté reste inchangé.
        </p>

        <AssetEditForm class="mt-5" :initial="asset" :saving="saving" :error="error" @submit="onSubmit" @cancel="close" />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { AssetCard, UpdateAssetBody } from '~/types/asset'

const props = defineProps<{ asset: AssetCard | null }>()
const emit = defineEmits<{ close: []; saved: [] }>()

const assetsApi = useAssets()

const saving = ref(false)
const error = ref<string | null>(null)

function close() {
  if (saving.value) return
  emit('close')
}

watch(() => props.asset, () => {
  error.value = null
})

async function onSubmit(payload: UpdateAssetBody) {
  if (!props.asset) return
  saving.value = true
  error.value = null
  try {
    await assetsApi.update(props.asset.id, payload)
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
  width: min(560px, 100%);
  padding: 24px;
  max-height: 92vh;
  overflow-y: auto;
}
</style>
