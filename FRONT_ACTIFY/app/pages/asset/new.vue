<script setup lang="ts">
import { ref } from 'vue'

const newItem = ref({
  name: '',
  description: '',
  image: null as File | null,
})

const imagePreview = ref('')

function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0] ?? null

  if (!file) return

  newItem.value.image = file
  imagePreview.value = URL.createObjectURL(file)
}

async function submitForm() {
  console.log('Submitting form with data:', newItem.value)
  await navigateTo('/profile')
}
</script>

<template>
  <div class="p-4 max-w-2xl mx-auto">
    <h1 class="text-2xl font-bold mb-4">Create New Asset</h1>

    <form @submit.prevent="submitForm" class="space-y-4">
      <div>
        <label for="name" class="block text-sm font-medium text-gray-700 mb-1">
          Name
        </label>
        <input
          id="name"
          v-model="newItem.name"
          type="text"
          required
          class="w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label for="description" class="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="description"
          v-model="newItem.description"
          rows="3"
          required
          class="w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label for="image" class="block text-sm font-medium text-gray-700 mb-1">
          Image
        </label>
        <input
          id="image"
          type="file"
          accept="image/*"
          required
          @change="handleFileUpload"
          class="block w-full rounded-md border border-gray-300 p-2 text-sm text-gray-500 file:mr-4 file:rounded-md file:border file:border-gray-300 file:bg-gray-50 file:px-4 file:py-2 file:text-sm file:font-semibold hover:file:bg-gray-100"
        />
      </div>

      <div v-if="imagePreview" class="mt-2">
        <img
          :src="imagePreview"
          alt="Preview"
          class="h-40 w-auto rounded-md border object-cover"
        />
      </div>

      <button
        type="submit"
        class="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        Create Asset
      </button>
    </form>
  </div>
</template>