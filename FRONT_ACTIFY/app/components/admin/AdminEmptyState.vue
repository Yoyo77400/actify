<template>
  <div class="surface flex flex-col items-center justify-center py-12 px-4 text-center">
    <Icon :name="icon" class="text-4xl text-muted-2 mb-3" />
    <p class="m-0 text-muted">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ message: string; icon?: string }>(), {
  icon: 'ph:empty'
})
</script>