import { ref } from 'vue'

// Filtering/search moved server-side (query params on the admin endpoints), so
// the store only carries the confirm-modal state shared between the admin
// pages and AdminConfirmModal.
export const useAdminStore = defineStore('admin', () => {
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

  // Callers pass actions that handle their own errors (they surface them in the
  // page's errorMsg), so the modal always closes.
  async function executeConfirm() {
    if (confirmAction.value) {
      await confirmAction.value()
    }
    cancelConfirm()
  }

  return {
    confirmAction,
    confirmMessage,
    confirmOpen,
    requestConfirm,
    cancelConfirm,
    executeConfirm,
  }
})
