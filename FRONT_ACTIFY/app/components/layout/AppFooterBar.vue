<template>
  <footer class="flex justify-between gap-4 flex-wrap mt-7 pt-5 border-t border-line text-xs text-muted">
    <div class="flex gap-3.5 flex-wrap">
      <a href="#">Terms of Service</a>
      <a href="#">Privacy Policy</a>
      <a href="#">Support</a>
    </div>
    <p>© {{ year }} Actify. All rights reserved.</p>
  </footer>
</template>

<script setup lang="ts">
  const date = new Date()
  const year = date.getFullYear();
</script>