<template>
  <div class="flex flex-col gap-7">
    <ProfileHeader :user="user" />

    <div class="grid grid-cols-[1fr_300px] max-xl:grid-cols-1 gap-[18px]">
      <div class="flex flex-col gap-7">
        <section>
          <CommonSectionHeader title="My Collections" subtitle="Your created and owned collections" />
          <div class="grid grid-cols-2 max-md:grid-cols-1 gap-4">
            <ProfileCollectionCard
              v-for="col in user.collections"
              :key="col.id"
              :collection="col"
            />
          </div>
        </section>

        <section>
          <CommonSectionHeader title="Recent Activity" subtitle="Your latest transactions" />
          <div class="surface overflow-hidden">
            <ProfileActivityRow
              v-for="(activity, i) in user.activity"
              :key="activity.id"
              :activity="activity"
              :last="i === user.activity.length - 1"
            />
          </div>
        </section>
      </div>

      <div class="flex flex-col gap-[18px]">
        <ProfileWalletCard :wallet="user.wallet" />
        <ProfileStatsCard :stats="user.stats" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { profileMock } from '~/composables/useProfileMock'

const user = profileMock

useHead({ title: 'Mon profil' })
</script>