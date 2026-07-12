<template>
  <div class="flex flex-col gap-9">
    <section class="surface relative overflow-hidden p-9 max-md:p-6">
      <div
        class="absolute inset-0 opacity-70 pointer-events-none"
        style="background: radial-gradient(circle at 15% 20%, rgba(35,99,255,0.28), transparent 45%), radial-gradient(circle at 85% 80%, rgba(240,255,61,0.12), transparent 40%);"
      />
      <div class="relative flex flex-col gap-5 max-w-2xl">
        <span class="pill-badge w-fit text-accent-2">
          <Icon name="ph:lightning" class="text-sm" />
          Licences numériques sur XRP Ledger
        </span>
        <h1 class="ethnocentric text-foreground text-4xl max-md:text-2xl leading-tight">
          Achetez et vendez des créations numériques certifiées
        </h1>
        <p class="text-muted text-base max-md:text-sm">
          Actify tokenise chaque licence en NFT infalsifiable sur le XRP Ledger. Explorez le
          catalogue, soutenez les créateurs, publiez vos propres assets en quelques clics.
        </p>
        <div class="flex flex-wrap gap-3">
          <NuxtLink to="/assets" class="primary-btn">
            <Icon name="ph:storefront" class="text-lg mr-2" />
            Explorer le marketplace
          </NuxtLink>
          <NuxtLink to="/asset/new" class="secondary-btn">
            <Icon name="ph:plus-circle" class="text-lg mr-2" />
            Publier un asset
          </NuxtLink>
        </div>
      </div>
    </section>

    <section v-if="categories.length">
      <CommonSectionHeader title="Catégories" subtitle="Trouvez ce qui vous inspire" />
      <div class="scroll-x flex gap-2.5">
        <NuxtLink
          v-for="cat in categories"
          :key="cat.id"
          :to="`/assets?category=${cat.slug}`"
          class="chip shrink-0"
        >
          {{ cat.name }}
          <span class="text-muted-2 ml-1">{{ cat.listingCount }}</span>
        </NuxtLink>
      </div>
    </section>

    <section>
      <CommonSectionHeader title="Derniers assets" subtitle="Les publications les plus récentes">
        <template #actions>
          <NuxtLink to="/assets" class="ghost-btn text-sm">Tout voir</NuxtLink>
        </template>
      </CommonSectionHeader>
      <div v-if="latest.length" class="grid grid-cols-4 max-xl:grid-cols-3 max-lg:grid-cols-2 max-sm:grid-cols-1 gap-4">
        <AssetMarketAssetCard v-for="asset in latest" :key="asset.id" :asset="asset" />
      </div>
      <div v-else class="surface p-10 text-center">
        <p class="text-muted text-sm">Le catalogue est encore vide. Soyez le premier à publier.</p>
        <NuxtLink to="/asset/new" class="text-accent text-sm hover:underline">Publier un asset</NuxtLink>
      </div>
    </section>

    <section v-if="trending.length">
      <CommonSectionHeader title="Tendances" subtitle="Les assets les plus consultés">
        <template #actions>
          <NuxtLink to="/assets?sort=views" class="ghost-btn text-sm">Tout voir</NuxtLink>
        </template>
      </CommonSectionHeader>
      <div class="grid grid-cols-4 max-xl:grid-cols-3 max-lg:grid-cols-2 max-sm:grid-cols-1 gap-4">
        <AssetMarketAssetCard v-for="asset in trending" :key="asset.id" :asset="asset" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { AssetCard, CategoryWithCount } from '~/types/asset'

const assetsApi = useAssets()

// One SSR round-trip for the whole landing; each source degrades to an empty
// list independently (allSettled) so a partial API outage still renders the
// sections that did load rather than blanking the whole page.
const { data } = await useAsyncData(
  'home-landing',
  async () => {
    const [categories, latest, trending] = await Promise.allSettled([
      assetsApi.categories(),
      assetsApi.list({ sort: 'createdAt', limit: 8 }),
      assetsApi.list({ sort: 'views', limit: 8 }),
    ])
    return {
      categories: categories.status === 'fulfilled' ? categories.value : [],
      latest: latest.status === 'fulfilled' ? latest.value : [],
      trending: trending.status === 'fulfilled' ? trending.value : [],
    }
  },
  {
    default: () => ({
      categories: [] as CategoryWithCount[],
      latest: [] as AssetCard[],
      trending: [] as AssetCard[],
    }),
  },
)

const categories = computed(() => data.value?.categories ?? [])
const latest = computed(() => data.value?.latest ?? [])
const trending = computed(() => data.value?.trending ?? [])

useHead({
  title: 'Accueil',
  meta: [
    {
      name: 'description',
      content: 'Actify — marketplace de licences numériques tokenisées en NFT sur le XRP Ledger.',
    },
  ],
})
</script>
