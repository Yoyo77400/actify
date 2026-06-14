<template>
  <div class="flex flex-col gap-5">
    <div class="flex items-center justify-between gap-4 max-sm:flex-col max-sm:items-stretch">
      <div>
        <h1 class="ethnocentric m-0 text-2xl">Reports</h1>
        <p class="mt-1 mb-0 text-muted text-sm">{{ total }} reports</p>
      </div>
      <AdminSearchBar v-model="store.search" placeholder="Search reports..." />
    </div>

    <div class="flex gap-2 scroll-x">
      <button
        v-for="f in filters"
        :key="f.value"
        class="chip shrink-0"
        :class="{ 'chip--active': store.reportFilter === f.value }"
        type="button"
        @click="store.reportFilter = f.value"
      >
        {{ f.label }}
      </button>
    </div>

    <div class="surface overflow-hidden">
      <AdminReportRow
        v-for="report in filtered"
        :key="report.id"
        :report="report"
        @resolve="onResolve"
        @dismiss="onDismiss"
      />
      <AdminEmptyState v-if="!filtered.length" message="No reports match your filters" icon="ph:flag" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { adminResolveReport, adminDismissReport } from '~/composables/useAdminApi'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Reports' })

const store = useAdminStore()
const { data } = await useAdminReports()
const total = computed(() => data.value.total)
const filtered = computed(() => store.filterReports(data.value.reports))

const filters = [
  { label: 'All', value: 'all' as const },
  { label: 'Open', value: 'open' as const },
  { label: 'Reviewing', value: 'reviewing' as const },
  { label: 'Resolved', value: 'resolved' as const },
  { label: 'Dismissed', value: 'dismissed' as const },
]

function onResolve(id: string) {
  store.requestConfirm('Mark this report as resolved?', () => adminResolveReport(id))
}
function onDismiss(id: string) {
  store.requestConfirm('Dismiss this report?', () => adminDismissReport(id))
}
</script>