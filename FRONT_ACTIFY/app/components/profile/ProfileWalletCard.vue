<template>
  <div class="surface p-4">
    <div class="flex items-center gap-2.5 mb-3">
      <Icon name="ph:wallet" class="text-lg text-muted" />
      <h3 class="m-0 text-sm font-semibold">Wallet</h3>
    </div>

    <div class="flex items-baseline gap-2 mb-3">
      <span class="text-2xl font-bold">{{ wallet.balance }}</span>
      <span class="text-muted text-sm">{{ wallet.currency }}</span>
    </div>

    <div class="flex flex-col gap-2 text-[13px]">
      <div class="flex justify-between">
        <span class="text-muted">Address</span>
        <span class="font-mono text-foreground">{{ wallet.address }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-muted">Chain</span>
        <span class="text-foreground">{{ wallet.chain }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProfileWallet } from '~/types/profile'

defineProps<{ wallet: ProfileWallet }>()
</script>