<template>
  <div class="flex items-center justify-between gap-3 px-4 py-3 border-b border-line last:border-b-0">
    <div class="min-w-0">
      <div class="flex items-center gap-2">
        <span class="pill-badge text-xs" :class="reasonBadge">{{ report.reason }}</span>
        <span class="pill-badge text-xs" :class="statusBadge">{{ report.status }}</span>
      </div>
      <p class="m-0 text-sm mt-1.5 truncate">
        <span class="text-muted">{{ report.targetType }}:</span>
        {{ report.targetName }}
      </p>
      <p class="m-0 text-xs text-muted-2 mt-1 line-clamp-1">{{ report.description }}</p>
      <p class="m-0 text-xs text-muted-2 mt-1">by {{ report.reportedBy }} · {{ formattedDate }}</p>
    </div>

    <div v-if="report.status === 'open' || report.status === 'reviewing'" class="flex gap-2 shrink-0">
      <button
        class="ghost-btn text-xs text-success"
        type="button"
        @click="emit('resolve', report.id)"
      >
        Resolve
      </button>
      <button
        class="ghost-btn text-xs text-muted"
        type="button"
        @click="emit('dismiss', report.id)"
      >
        Dismiss
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AdminReport } from '~/types/admin'

const props = defineProps<{ report: AdminReport }>()
const emit = defineEmits<{
  resolve: [id: string]
  dismiss: [id: string]
}>()

const formattedDate = computed(() => {
  const d = new Date(props.report.createdAt)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
})

const reasonBadge = computed(() => ({
  'bg-danger/12 text-danger border-danger/20': props.report.reason === 'scam',
  'bg-warning/12 text-warning border-warning/20': props.report.reason === 'copyright' || props.report.reason === 'fake',
  'bg-accent/12 text-accent border-accent/20': props.report.reason === 'inappropriate',
  'bg-muted/12 text-muted border-muted/20': props.report.reason === 'other',
}))

const statusBadge = computed(() => ({
  'bg-danger/12 text-danger border-danger/20': props.report.status === 'open',
  'bg-warning/12 text-warning border-warning/20': props.report.status === 'reviewing',
  'bg-success/12 text-success border-success/20': props.report.status === 'resolved',
  'bg-muted/12 text-muted border-muted/20': props.report.status === 'dismissed',
}))
</script>