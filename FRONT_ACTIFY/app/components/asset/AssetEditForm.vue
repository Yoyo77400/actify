<template>
  <form class="flex flex-col gap-4" @submit.prevent="submit">
    <div class="flex flex-col gap-1.5">
      <label for="edit-asset-title-input" class="text-foreground text-sm font-medium">Titre</label>
      <input id="edit-asset-title-input" v-model.trim="form.title" type="text" required minlength="3" maxlength="200" class="input">
    </div>

    <div class="flex flex-col gap-1.5">
      <label for="edit-asset-short" class="text-foreground text-sm font-medium">Accroche</label>
      <input id="edit-asset-short" v-model.trim="form.shortDescription" type="text" maxlength="200" class="input">
    </div>

    <div class="flex flex-col gap-1.5">
      <label for="edit-asset-desc" class="text-foreground text-sm font-medium">Description</label>
      <textarea id="edit-asset-desc" v-model.trim="form.description" rows="3" class="input py-3 resize-none" style="min-height: 80px" />
    </div>

    <div class="flex flex-col gap-1.5">
      <label for="edit-asset-tags" class="text-foreground text-sm font-medium">Tags</label>
      <input id="edit-asset-tags" v-model.trim="form.tags" type="text" placeholder="cyberpunk, texture, 4k" class="input">
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-foreground text-sm font-medium">Mode de distribution</span>
      <div class="grid grid-cols-3 max-sm:grid-cols-1 gap-2">
        <button
          v-for="mode in DISTRIBUTION_MODES"
          :key="mode.value"
          type="button"
          class="rounded-xl border px-3 py-2 text-left text-sm transition-colors"
          :class="form.distributionMode === mode.value
            ? 'border-accent bg-panel-3 text-foreground'
            : 'border-line bg-transparent text-muted hover:border-line-strong'"
          @click="form.distributionMode = mode.value"
        >
          {{ mode.label }}
        </button>
      </div>
    </div>

    <div v-if="form.distributionMode === 'limited'" class="flex flex-col gap-1.5">
      <label for="edit-asset-max" class="text-foreground text-sm font-medium">Téléchargements maximum</label>
      <input id="edit-asset-max" v-model.number="form.maxDownloads" type="number" min="1" step="1" class="input">
    </div>

    <label class="flex items-center gap-3 cursor-pointer select-none">
      <input v-model="form.isFree" type="checkbox" class="w-4 h-4 accent-[#2363ff]">
      <span class="text-foreground text-sm font-medium">Asset gratuit</span>
    </label>

    <div v-if="!form.isFree" class="flex flex-col gap-1.5">
      <label for="edit-asset-price" class="text-foreground text-sm font-medium">Prix (XRP)</label>
      <input id="edit-asset-price" v-model.number="form.basePrice" type="number" min="0" step="0.000001" class="input">
    </div>

    <div class="flex flex-col gap-1.5">
      <label for="edit-asset-royalty" class="text-foreground text-sm font-medium">Royalties (%)</label>
      <input id="edit-asset-royalty" v-model.number="form.royaltyPercent" type="number" min="0" max="100" step="0.01" class="input">
    </div>

    <p v-if="error" class="text-danger text-sm" role="alert">{{ error }}</p>

    <div class="flex gap-2.5 justify-end">
      <button class="ghost-btn text-sm" type="button" :disabled="saving" @click="emit('cancel')">Annuler</button>
      <button class="primary-btn text-sm px-5" type="submit" :disabled="saving">
        {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import type { AssetCard, UpdateAssetBody } from '~/types/asset'

type DistributionMode = 'unlimited' | 'limited' | 'unique'

const DISTRIBUTION_MODES: Array<{ value: DistributionMode; label: string }> = [
  { value: 'unlimited', label: 'Illimité' },
  { value: 'limited', label: 'Limité' },
  { value: 'unique', label: 'Pièce unique' },
]

const props = defineProps<{
  initial: AssetCard
  saving: boolean
  error: string | null
}>()
const emit = defineEmits<{ submit: [UpdateAssetBody]; cancel: [] }>()

const form = reactive({
  title: '',
  shortDescription: '',
  description: '',
  tags: '',
  distributionMode: 'unlimited' as DistributionMode,
  maxDownloads: null as number | null,
  isFree: false,
  basePrice: null as number | null,
  royaltyPercent: 0,
})

watch(() => props.initial, (asset) => {
  form.title = asset.title
  form.shortDescription = asset.shortDescription ?? ''
  form.description = asset.description ?? ''
  form.tags = asset.tags.join(', ')
  form.distributionMode = (asset.distributionMode as DistributionMode) ?? 'unlimited'
  form.maxDownloads = asset.maxDownloads
  form.isFree = asset.isFree
  form.basePrice = asset.price != null ? Number(asset.price) : null
  form.royaltyPercent = asset.royaltyBps != null ? asset.royaltyBps / 100 : 0
}, { immediate: true })

function submit() {
  emit('submit', {
    title: form.title,
    shortDescription: form.shortDescription || null,
    description: form.description || null,
    tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
    distributionMode: form.distributionMode,
    maxDownloads: form.distributionMode === 'limited' ? form.maxDownloads : null,
    isFree: form.isFree,
    basePrice: form.isFree ? null : form.basePrice,
    royaltyBps: Math.round(Math.min(100, Math.max(0, form.royaltyPercent)) * 100),
  })
}
</script>
