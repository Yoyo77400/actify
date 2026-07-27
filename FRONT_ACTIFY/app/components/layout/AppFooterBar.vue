<template>
  <footer class="grid grid-cols-3 max-sm:grid-cols-1 items-center gap-3 mt-7 pt-5 border-t border-line text-xs text-muted">
    <div class="flex gap-3.5 flex-wrap max-sm:justify-center">
      <NuxtLink to="/terms">Conditions d'utilisation</NuxtLink>
      <NuxtLink to="/privacy">Politique de confidentialité</NuxtLink>
      <!-- No support page exists — a mailto to the team contact is the honest target. -->
      <a href="mailto:yohan.georgelin@gmail.com">Support</a>
    </div>
    <img src="/actify-rectangular.png" alt="Actify" class="h-5 w-auto mx-auto">
    <p class="justify-self-end max-sm:justify-self-center">© {{ year }} Actify. All rights reserved.</p>
  </footer>
</template>

<script setup lang="ts">
  const date = new Date()
  const year = date.getFullYear();
</script>