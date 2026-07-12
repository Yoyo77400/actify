<template>
  <section class="surface mt-[18px] p-[18px]">
    <div class="flex gap-3 border-b border-line pb-2.5">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="pb-2 border-0 bg-transparent border-b-2 border-transparent"
        :class="ui.assetTab === tab.id ? 'text-foreground !border-white' : 'text-muted'"
        type="button"
        @click="ui.setAssetTab(tab.id)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="pt-4">
      <div v-if="ui.assetTab === 'description'">
        <h2 class="ethnocentric m-0 mb-2.5 text-lg">Description</h2>
        <p class="m-0 leading-relaxed">{{ description }}</p>
      </div>
      <div v-else-if="ui.assetTab === 'orders'">
        <h2 class="ethnocentric m-0 mb-2.5 text-lg">Orders</h2>
        <p class="m-0 text-muted leading-relaxed">Aucun ordre réel branché pour le moment. Cette zone est prête pour la V2 backend.</p>
      </div>
      <div v-else>
        <h2 class="ethnocentric m-0 mb-2.5 text-lg">Activity</h2>
        <p class="m-0 text-muted leading-relaxed">Aucune activité réelle branchée pour le moment. Cette zone est prête pour l'historique on-chain ou backend.</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const props = defineProps<{
  tabs: Array<{ id: 'description' | 'orders' | 'activity'; label: string }>
  description: string
}>()

const ui = useMarketplaceUiStore()

watchEffect(() => {
  const valid = props.tabs.some((tab) => tab.id === ui.assetTab)
  const firstTab = props.tabs[0]
  if (!valid && firstTab) {
    ui.setAssetTab(firstTab.id)
  }
})
</script>
