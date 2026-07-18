<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <!-- Above every layout: the consent choice must be reachable on any page,
       including auth and error screens. -->
  <CommonCookieConsentBanner />
</template>
