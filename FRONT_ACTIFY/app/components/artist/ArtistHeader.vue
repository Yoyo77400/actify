<template>
  <section class="surface relative overflow-hidden mb-[18px]">
    <!-- The public profile API exposes no cover image — decorative gradient instead. -->
    <div
      class="absolute inset-0 pointer-events-none"
      style="background: radial-gradient(circle at 15% 20%, rgba(35,99,255,0.28), transparent 45%), radial-gradient(circle at 85% 80%, rgba(240,255,61,0.12), transparent 40%);"
    />

    <div class="relative z-10 pt-7 px-6 pb-6 flex flex-col justify-end min-h-[220px]">
      <div class="flex items-end gap-4 max-sm:flex-col max-sm:items-start">
        <img
          v-if="avatarUrl"
          class="w-[92px] h-[92px] rounded-full object-cover border-2 border-white/18"
          :src="avatarUrl"
          :alt="name"
        >
        <!-- No avatar uploaded — neutral local tile, no third-party placeholder service. -->
        <div
          v-else
          class="w-[92px] h-[92px] rounded-full border-2 border-white/18 bg-panel-3 grid place-items-center shrink-0"
        >
          <Icon name="ph:user" class="text-3xl text-muted" />
        </div>
        <div>
          <h1 class="ethnocentric m-0 text-[clamp(28px,4vw,44px)]">{{ name }}</h1>
          <div class="flex gap-2.5 flex-wrap mt-2.5">
            <span v-if="artist.username" class="pill-badge">@{{ artist.username }}</span>
            <span class="pill-badge">Inscrit le {{ joinedLabel }}</span>
            <span v-if="artist.isVerified" class="pill-badge text-accent-2">
              <Icon name="ph:seal-check" class="text-sm" />
              Vérifié
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { PublicProfile } from '~/types/marketplace'

const props = defineProps<{ artist: PublicProfile }>()

const name = computed(() => props.artist.displayName ?? props.artist.username ?? 'Artiste')

// Avatar served by our own API — no third-party gateway (privacy policy).
const avatarUrl = computed(() => fileUrl(props.artist.avatarCid))

// Pinned timezone: SSR-rendered, keep server and client output identical.
const joinedLabel = computed(() =>
  new Date(props.artist.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'Europe/Paris' }),
)
</script>
