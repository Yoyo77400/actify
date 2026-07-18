<template>
  <div class="flex flex-col gap-6 max-w-3xl">
    <section class="surface p-8 max-md:p-5 flex flex-col gap-4">
      <span class="pill-badge w-fit text-accent-2">
        <Icon name="ph:scroll" class="text-sm" />
        Conditions
      </span>
      <h1 class="ethnocentric text-foreground text-3xl max-md:text-xl leading-tight">
        Conditions d'utilisation
      </h1>
      <p class="text-muted text-sm leading-relaxed">
        Dernière mise à jour : 18 juillet 2026. En créant un compte ou en
        utilisant Actify, vous acceptez les présentes conditions.
      </p>
    </section>

    <section class="surface p-6 max-md:p-5 flex flex-col gap-3">
      <h2 class="text-foreground font-semibold text-lg">1. Objet du service</h2>
      <p class="text-muted text-sm leading-relaxed">
        Actify est un marketplace de fichiers numériques (visuels, audio,
        documents, code…) dont les licences d'utilisation sont matérialisées par
        des NFT au standard XLS-20 sur le XRP Ledger, émis par le créateur lors
        de la tokenisation de son asset. L'achat d'un asset s'effectue par un
        paiement XRP inscrit sur le ledger et vérifié par la plateforme ; il
        ouvre le droit de télécharger le fichier associé, sans transfert du NFT
        vers votre wallet. Le NFT atteste la licence ; il ne transfère pas la
        propriété intellectuelle de l'œuvre.
      </p>
    </section>

    <section class="surface p-6 max-md:p-5 flex flex-col gap-3">
      <h2 class="text-foreground font-semibold text-lg">2. Réseau de test — aucune valeur monétaire</h2>
      <p class="text-muted text-sm leading-relaxed">
        Actify est un projet académique (ESGI, année 2025-2026) sans vocation
        commerciale, opéré sur le <span class="text-foreground">XRPL
        Testnet</span>. Les XRP qui y circulent sont des jetons de test,
        distribués gratuitement par des faucets :
        <span class="text-foreground">ils n'ont aucune valeur monétaire
        réelle</span>. Aucun paiement en monnaie ayant cours légal ni en
        crypto-actif de valeur n'est effectué sur la plateforme, et aucun
        remboursement n'a donc lieu d'être. N'utilisez jamais un wallet
        contenant des fonds réels (mainnet) pour interagir avec Actify.
      </p>
    </section>

    <section class="surface p-6 max-md:p-5 flex flex-col gap-3">
      <h2 class="text-foreground font-semibold text-lg">3. Comptes et connexion par wallet</h2>
      <p class="text-muted text-sm leading-relaxed">
        La connexion s'effectue par signature d'un défi avec votre wallet XRPL
        (GemWallet, Crossmark). Vous êtes seul responsable de la garde de vos
        clés privées : nous n'y avons jamais accès et ne pouvons pas restaurer
        un wallet perdu. Vous vous engagez à fournir des informations de profil
        exactes et à ne pas usurper l'identité d'un tiers.
      </p>
    </section>

    <section class="surface p-6 max-md:p-5 flex flex-col gap-3">
      <h2 class="text-foreground font-semibold text-lg">4. Contenus publiés</h2>
      <p class="text-muted text-sm leading-relaxed">
        En publiant un asset, vous garantissez détenir l'ensemble des droits
        nécessaires sur le fichier et ses visuels (création originale ou
        licence vous autorisant la redistribution), et vous concédez aux
        acheteurs la licence d'utilisation décrite sur la fiche de l'asset.
        Sont interdits : les contenus contrefaisants, illicites, haineux,
        trompeurs ou malveillants (malwares). Vous restez seul responsable des
        contenus que vous publiez.
      </p>
    </section>

    <section class="surface p-6 max-md:p-5 flex flex-col gap-3">
      <h2 class="text-foreground font-semibold text-lg">5. Modération et bannissement</h2>
      <p class="text-muted text-sm leading-relaxed">
        L'équipe de modération peut retirer un asset, masquer un avis,
        suspendre ou bannir un compte en cas de violation des présentes
        conditions, sur signalement ou de sa propre initiative. Les NFT déjà
        émis sur le ledger ne peuvent pas être révoqués (registre immuable),
        mais l'accès au téléchargement du fichier peut être coupé.
      </p>
    </section>

    <section class="surface p-6 max-md:p-5 flex flex-col gap-3">
      <h2 class="text-foreground font-semibold text-lg">6. Disponibilité et garanties</h2>
      <p class="text-muted text-sm leading-relaxed">
        Le service est fourni « en l'état », dans le cadre d'un projet
        étudiant : aucune garantie de disponibilité, de pérennité ni d'absence
        d'erreur n'est donnée. La plateforme peut être interrompue, modifiée ou
        arrêtée à tout moment, notamment à la clôture de l'année universitaire.
        La responsabilité de l'équipe projet ne saurait être engagée au-delà de
        ce que la loi impose pour un service gratuit et expérimental.
      </p>
    </section>

    <section class="surface p-6 max-md:p-5 flex flex-col gap-3">
      <h2 class="text-foreground font-semibold text-lg">7. Droit applicable</h2>
      <p class="text-muted text-sm leading-relaxed">
        Les présentes conditions sont régies par le droit français. Tout
        différend qui ne trouverait pas de solution amiable relève des
        juridictions françaises compétentes. Pour toute question :
        <a href="mailto:yohan.georgelin@gmail.com" class="text-accent hover:underline">yohan.georgelin@gmail.com</a>.
      </p>
    </section>

    <p class="text-muted-2 text-xs">
      Voir aussi notre
      <NuxtLink to="/privacy" class="text-accent hover:underline">Politique de confidentialité</NuxtLink>.
    </p>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Conditions d\'utilisation',
  meta: [
    {
      name: 'description',
      content:
        'Conditions d\'utilisation d\'Actify : marketplace académique de licences NFT XLS-20 sur XRPL Testnet, sans valeur monétaire réelle.',
    },
  ],
})
</script>
