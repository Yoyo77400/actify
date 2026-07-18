<template>
  <footer class="flex justify-between gap-4 flex-wrap mt-7 pt-5 border-t border-line text-xs text-muted">
    <div class="flex gap-3.5 flex-wrap">
      <NuxtLink to="/terms">Conditions d'utilisation</NuxtLink>
      <NuxtLink to="/privacy">Politique de confidentialité</NuxtLink>
      <!-- No support page exists — a mailto to the team contact is the honest target. -->
      <a href="mailto:yohan.georgelin@gmail.com">Support</a>
    </div>
    <p>© {{ year }} Actify. All rights reserved.</p>
  </footer>
</template>

<script setup lang="ts">
  const date = new Date()
  const year = date.getFullYear();
</script>