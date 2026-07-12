<template>
  <button
    class="w-full flex items-center justify-center gap-3 h-12 rounded-xl border transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
    :class="styles.button"
    :disabled="loading || disabled"
    :title="disabled ? 'Bientôt disponible' : undefined"
    @click="$emit('click')"
  >
    <Icon :name="styles.icon" class="text-xl shrink-0" />
    <span class="font-medium text-sm">{{ loading ? 'Connexion...' : styles.label }}</span>
  </button>
</template>

<script setup lang="ts">
type Provider = 'google' | 'github'

const props = defineProps<{
  provider: Provider
  loading?: boolean
  disabled?: boolean
}>()

defineEmits<{
  click: []
}>()

const providerConfig: Record<Provider, { icon: string; label: string; button: string }> = {
  google: {
    icon: 'logos:google-icon',
    label: 'Continuer avec Google',
    button: 'bg-white text-gray-800 border-white/20 hover:bg-white/90'
  },
  github: {
    icon: 'mdi:github',
    label: 'Continuer avec GitHub',
    button: 'bg-[#24292e] text-white border-white/10 hover:bg-[#2f363d]'
  }
}

const styles = computed(() => providerConfig[props.provider])
</script>
