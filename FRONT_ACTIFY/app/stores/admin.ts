import { ref } from 'vue'
import type { AdminUser, AdminSale, AdminAsset, AdminReport } from '~/types/admin'

export const useAdminStore = defineStore('admin', () => {
  const search = ref('')
  const userFilter = ref<'all' | 'active' | 'suspended' | 'banned'>('all')
  const saleFilter = ref<'all' | 'completed' | 'pending' | 'disputed' | 'cancelled' | 'refunded'>('all')
  const assetFilter = ref<'all' | 'listed' | 'unlisted' | 'flagged' | 'removed'>('all')
  const reportFilter = ref<'all' | 'open' | 'reviewing' | 'resolved' | 'dismissed'>('all')

  // confirm modal state
  const confirmAction = ref<(() => Promise<unknown>) | null>(null)
  const confirmMessage = ref('')
  const confirmOpen = ref(false)

  function requestConfirm(message: string, action: () => Promise<unknown>) {
    confirmMessage.value = message
    confirmAction.value = action
    confirmOpen.value = true
  }

  function cancelConfirm() {
    confirmOpen.value = false
    confirmAction.value = null
    confirmMessage.value = ''
  }

  async function executeConfirm() {
    if (confirmAction.value) {
      await confirmAction.value()
    }
    cancelConfirm()
  }

  function filterUsers(users: AdminUser[]) {
    let result = users
    if (userFilter.value !== 'all') {
      result = result.filter(u => u.status === userFilter.value)
    }
    if (search.value) {
      const q = search.value.toLowerCase()
      result = result.filter(u =>
        u.displayName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.wallet.toLowerCase().includes(q)
      )
    }
    return result
  }

  function filterSales(sales: AdminSale[]) {
    let result = sales
    if (saleFilter.value !== 'all') {
      result = result.filter(s => s.status === saleFilter.value)
    }
    if (search.value) {
      const q = search.value.toLowerCase()
      result = result.filter(s =>
        s.assetName.toLowerCase().includes(q) ||
        s.seller.toLowerCase().includes(q) ||
        s.buyer.toLowerCase().includes(q) ||
        s.txHash.toLowerCase().includes(q)
      )
    }
    return result
  }

  function filterAssets(assets: AdminAsset[]) {
    let result = assets
    if (assetFilter.value !== 'all') {
      result = result.filter(a => a.status === assetFilter.value)
    }
    if (search.value) {
      const q = search.value.toLowerCase()
      result = result.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.creator.toLowerCase().includes(q) ||
        a.collection.toLowerCase().includes(q)
      )
    }
    return result
  }

  function filterReports(reports: AdminReport[]) {
    let result = reports
    if (reportFilter.value !== 'all') {
      result = result.filter(r => r.status === reportFilter.value)
    }
    if (search.value) {
      const q = search.value.toLowerCase()
      result = result.filter(r =>
        r.targetName.toLowerCase().includes(q) ||
        r.reportedBy.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q)
      )
    }
    return result
  }

  return {
    search,
    userFilter,
    saleFilter,
    assetFilter,
    reportFilter,
    confirmAction,
    confirmMessage,
    confirmOpen,
    requestConfirm,
    cancelConfirm,
    executeConfirm,
    filterUsers,
    filterSales,
    filterAssets,
    filterReports
  }
})