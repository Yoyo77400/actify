<template>
  <div class="flex flex-col gap-7">
    <div>
      <h1 class="ethnocentric m-0 text-2xl">Dashboard</h1>
      <p class="mt-1 mb-0 text-muted text-sm">Overview of platform activity</p>
    </div>

    <div class="grid grid-cols-3 max-lg:grid-cols-2 max-sm:grid-cols-1 gap-4">
      <AdminStatCard label="Total users" :value="stats.totalUsers.toLocaleString()" :change="stats.userGrowth" />
      <AdminStatCard label="Active users" :value="stats.activeUsers.toLocaleString()" />
      <AdminStatCard label="Total sales" :value="stats.totalSales.toLocaleString()" :change="stats.salesGrowth" />
      <AdminStatCard label="Total volume" :value="stats.totalVolume" :change="stats.volumeGrowth" />
      <AdminStatCard label="Pending reports" :value="stats.pendingReports" />
      <AdminStatCard label="Flagged assets" :value="stats.flaggedAssets" />
    </div>

    <div class="grid grid-cols-[1fr_1fr] max-lg:grid-cols-1 gap-[18px]">
      <section>
        <h2 class="ethnocentric m-0 text-lg mb-3">Recent sales</h2>
        <div class="surface overflow-hidden">
          <AdminSaleRow
            v-for="sale in payload.recentSales"
            :key="sale.id"
            :sale="sale"
            @cancel="onCancelSale"
            @refund="onRefundSale"
            @delete="onDeleteSale"
          />
        </div>
      </section>

      <section>
        <h2 class="ethnocentric m-0 text-lg mb-3">Open reports</h2>
        <div class="surface overflow-hidden">
          <AdminReportRow
            v-for="report in payload.recentReports"
            :key="report.id"
            :report="report"
            @resolve="onResolveReport"
            @dismiss="onDismissReport"
          />
          <AdminEmptyState
            v-if="!payload.recentReports.length"
            message="No open reports"
            icon="ph:check-circle"
          />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  adminCancelSale,
  adminRefundSale,
  adminDeleteSale,
  adminResolveReport,
  adminDismissReport
} from '~/composables/useAdminApi'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'Dashboard' })

const { data } = await useAdminDashboard()
const payload = computed(() => data.value)
const stats = computed(() => payload.value.stats)

const store = useAdminStore()

function onCancelSale(id: string) {
  store.requestConfirm('Cancel this sale? The transaction will be voided.', () => adminCancelSale(id))
}
function onRefundSale(id: string) {
  store.requestConfirm('Refund this sale? Funds will be returned to the buyer.', () => adminRefundSale(id))
}
function onDeleteSale(id: string) {
  store.requestConfirm('Permanently delete this sale record? This cannot be undone.', () => adminDeleteSale(id))
}
function onResolveReport(id: string) {
  store.requestConfirm('Mark this report as resolved?', () => adminResolveReport(id))
}
function onDismissReport(id: string) {
  store.requestConfirm('Dismiss this report? No action will be taken.', () => adminDismissReport(id))
}
</script>