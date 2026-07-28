<template>
  <div class="flex items-center gap-2">
    <Icon name="ph:calendar-blank" class="text-muted shrink-0" />
    <input
      :value="modelValue.from ?? ''"
      type="date"
      class="input !h-11 !w-[150px]"
      aria-label="Depuis le"
      @change="onChange('from', $event)"
    >
    <span class="text-muted-2">→</span>
    <input
      :value="modelValue.to ?? ''"
      type="date"
      class="input !h-11 !w-[150px]"
      aria-label="Jusqu'au"
      @change="onChange('to', $event)"
    >
    <button
      v-if="modelValue.from || modelValue.to"
      type="button"
      class="text-muted hover:text-foreground border-0 bg-transparent p-0"
      aria-label="Réinitialiser la période"
      @click="emit('update:modelValue', {})"
    >
      <Icon name="ph:x" />
    </button>
  </div>
</template>

<script setup lang="ts">
export interface DateRangeValue {
  from?: string
  to?: string
}

const props = defineProps<{ modelValue: DateRangeValue }>()
const emit = defineEmits<{ 'update:modelValue': [DateRangeValue] }>()

function onChange(key: 'from' | 'to', event: Event) {
  const value = (event.target as HTMLInputElement).value || undefined
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}
</script>
