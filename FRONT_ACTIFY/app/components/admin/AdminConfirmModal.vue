<template>
  <Teleport to="body">
    <div v-if="store.confirmOpen" class="modal-overlay" @click.self="store.cancelConfirm">
      <div class="surface modal-box">
        <h3 class="m-0 text-lg font-semibold">Confirmer l'action</h3>
        <p class="mt-3 mb-0 text-muted text-sm leading-relaxed">{{ store.confirmMessage }}</p>
        <div class="flex gap-2.5 justify-end mt-5">
          <button class="ghost-btn text-sm" type="button" @click="store.cancelConfirm">
            Annuler
          </button>
          <button class="primary-btn text-sm" type="button" @click="store.executeConfirm">
            Confirmer
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const store = useAdminStore()
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
}
.modal-box {
  width: min(420px, 90vw);
  padding: 24px;
}
</style>