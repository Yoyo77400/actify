<template>
  <div class="surface--soft h-11 px-3 flex items-center gap-2.5 w-full max-w-[360px]">
    <Icon name="ph:magnifying-glass" class="text-muted shrink-0" />
    <input
      :value="modelValue"
      class="flex-1 bg-transparent border-0 outline-none text-foreground placeholder:text-muted-2 text-sm"
      type="text"
      :placeholder="placeholder"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <button
      v-if="modelValue"
      class="text-muted hover:text-foreground border-0 bg-transparent p-0"
      type="button"
      @click="$emit('update:modelValue', '')"
    >
      <Icon name="ph:x" />
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string
  placeholder?: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>