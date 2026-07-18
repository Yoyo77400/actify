<template>
  <div class="flex flex-col gap-6 max-w-3xl">
    <section class="surface p-8 max-md:p-5 flex flex-col gap-4">
      <span class="pill-badge w-fit text-accent-2">
        <Icon name="ph:shield-check" class="text-sm" />
        RGPD
      </span>
      <h1 class="ethnocentric text-foreground text-3xl max-md:text-xl leading-tight">
        Politique de confidentialité
      </h1>
      <p class="text-muted text-sm leading-relaxed">
        Dernière mise à jour : 18 juillet 2026. Cette politique décrit les
        données traitées par Actify, pourquoi nous les traitons et comment
        exercer vos droits.
      </p>
    </section>

    <section class="surface p-6 max-md:p-5 flex flex-col gap-3">
      <h2 class="text-foreground font-semibold text-lg">1. Responsable du traitement</h2>
      <p class="text-muted text-sm leading-relaxed">
        Actify est un projet académique réalisé par une équipe d'étudiants de
        l'ESGI (année 2025-2026), sans vocation commerciale. Le responsable du
        traitement est l'équipe projet Actify, joignable à l'adresse
        <a href="mailto:yohan.georgelin@gmail.com" class="text-accent hover:underline">yohan.georgelin@gmail.com</a>.
        Aucune donnée n'est vendue, louée ni transmise à des fins publicitaires.
      </p>
    </section>

    <section class="surface p-6 max-md:p-5 flex flex-col gap-3">
      <h2 class="text-foreground font-semibold text-lg">2. Données que nous traitons</h2>
      <ul class="text-muted text-sm leading-relaxed list-disc pl-5 flex flex-col gap-1.5">
        <li>
          <span class="text-foreground">Profil</span> — nom d'utilisateur, nom
          affiché, biographie, avatar, adresse e-mail (facultative).
        </li>
        <li>
          <span class="text-foreground">Wallets XRPL</span> — adresses publiques
          des wallets que vous liez à votre compte pour vous connecter et signer
          vos transactions.
        </li>
        <li>
          <span class="text-foreground">Activité sur le marketplace</span> —
          commandes et achats, avis publiés, favoris, historique de
          téléchargements.
        </li>
        <li>
          <span class="text-foreground">Contenus</span> — fichiers numériques et
          visuels que vous téléversez lorsque vous publiez un asset.
        </li>
        <li>
          <span class="text-foreground">Logs techniques</span> — journaux
          serveur (adresse IP, horodatage, route appelée) nécessaires au
          fonctionnement et à la sécurité de la plateforme.
        </li>
      </ul>
    </section>

    <section class="surface p-6 max-md:p-5 flex flex-col gap-3">
      <h2 class="text-foreground font-semibold text-lg">3. Finalités et bases légales</h2>
      <ul class="text-muted text-sm leading-relaxed list-disc pl-5 flex flex-col gap-1.5">
        <li>
          <span class="text-foreground">Fournir le service</span> (compte,
          publication, achat, téléchargement des licences) — exécution du
          contrat qui nous lie lorsque vous créez un compte.
        </li>
        <li>
          <span class="text-foreground">Sécurité et prévention des abus</span>
          (authentification, logs, modération) — intérêt légitime à maintenir
          une plateforme sûre.
        </li>
        <li>
          <span class="text-foreground">Mesure d'audience</span> via Umami —
          uniquement avec votre consentement, exprimé via le bandeau de
          cookies et révocable à l'expiration de ce choix (180 jours) ou en
          supprimant le cookie <code>actify_consent</code>.
        </li>
      </ul>
    </section>

    <section class="surface p-6 max-md:p-5 flex flex-col gap-3">
      <h2 class="text-foreground font-semibold text-lg">4. Durées de conservation</h2>
      <ul class="text-muted text-sm leading-relaxed list-disc pl-5 flex flex-col gap-1.5">
        <li>
          Données de profil (nom d'utilisateur, nom affiché, e-mail, biographie,
          avatar) et wallets liés : tant que votre compte est actif. À la
          suppression du compte, le profil est anonymisé et les wallets liés
          sont supprimés.
        </li>
        <li>
          Contributions et historique (avis, favoris, téléchargements,
          enregistrements d'achat, fichiers publiés) : conservés après la
          suppression du compte, sous forme dissociée de votre profil (les avis
          restent affichés de façon anonyme, les achats gardent leur trace
          transactionnelle). Pour demander l'effacement complet de contenus,
          écrivez-nous à
          <a href="mailto:yohan.georgelin@gmail.com" class="text-accent hover:underline">yohan.georgelin@gmail.com</a>.
        </li>
        <li>Logs techniques : conservés au maximum 12 mois.</li>
        <li>
          Projet académique oblige : la plateforme et l'ensemble de ses données
          applicatives ont vocation à être supprimées à la clôture du projet
          (fin de l'année universitaire 2025-2026), hors éventuelle reprise
          annoncée aux utilisateurs.
        </li>
      </ul>
    </section>

    <section class="surface p-6 max-md:p-5 flex flex-col gap-3">
      <h2 class="text-foreground font-semibold text-lg">5. Hébergement</h2>
      <p class="text-muted text-sm leading-relaxed">
        L'application, sa base de données, les fichiers téléversés et l'outil de
        mesure d'audience sont hébergés sur un serveur privé virtuel (VPS)
        localisé en Europe. Aucune donnée applicative n'est transférée hors de
        l'Union européenne par nos soins.
      </p>
    </section>

    <section class="surface p-6 max-md:p-5 flex flex-col gap-3">
      <h2 class="text-foreground font-semibold text-lg">6. Blockchain XRPL : un registre public et immuable</h2>
      <p class="text-muted text-sm leading-relaxed">
        Les paiements et l'émission (mint) des licences NFT s'effectuent sur le
        XRP Ledger, un registre public, distribué et immuable. Chaque
        transaction que vous signez y est inscrite de façon permanente et
        consultable par quiconque : adresses de wallet émettrice et
        destinataire, montant, horodatage, identifiant du NFT. Ni Actify ni
        personne ne peut modifier ou effacer ces inscriptions.
      </p>
      <p class="text-muted text-sm leading-relaxed">
        Concrètement : la suppression de votre compte anonymise votre profil
        sur nos serveurs (nom d'utilisateur, nom affiché, e-mail, biographie,
        avatar) et supprime vos wallets liés ; vos contributions publiques
        (avis, fichiers publiés) et vos enregistrements d'achat sont conservés
        sous forme dissociée de votre profil, notamment pour préserver la
        correspondance avec les transactions inscrites sur le ledger — que
        rien ne peut retirer du registre. C'est une caractéristique
        intrinsèque de la blockchain, que vous acceptez en utilisant un wallet
        XRPL avec Actify. Nous limitons ce qui part on-chain au strict
        nécessaire : aucune donnée de profil (nom, e-mail, biographie) n'est
        écrite sur le ledger — seules vos adresses publiques de wallet et les
        transactions que vous signez y figurent.
      </p>
    </section>

    <section class="surface p-6 max-md:p-5 flex flex-col gap-3">
      <h2 class="text-foreground font-semibold text-lg">7. Vos droits</h2>
      <p class="text-muted text-sm leading-relaxed">
        Conformément au RGPD, vous disposez des droits d'accès, de
        rectification, de portabilité (export de vos données au format JSON) et
        de suppression de votre compte. Pour les exercer, écrivez-nous à
        <a href="mailto:yohan.georgelin@gmail.com" class="text-accent hover:underline">yohan.georgelin@gmail.com</a>
        depuis l'adresse associée à votre compte ou en justifiant de votre
        identité de wallet ; nous répondons dans un délai maximal d'un mois.
        Vous pouvez également modifier vos informations de profil directement
        depuis l'application. Si vous estimez que vos droits ne sont pas
        respectés, vous pouvez saisir la CNIL (cnil.fr).
      </p>
    </section>

    <section class="surface p-6 max-md:p-5 flex flex-col gap-3">
      <h2 class="text-foreground font-semibold text-lg">8. Cookies et mesure d'audience</h2>
      <div class="scroll-x">
        <table class="w-full text-sm text-left border-collapse min-w-[560px]">
          <thead>
            <tr class="text-muted-2 text-xs uppercase tracking-wide border-b border-line">
              <th class="py-2 pr-4 font-medium">Nom</th>
              <th class="py-2 pr-4 font-medium">Type</th>
              <th class="py-2 pr-4 font-medium">Durée</th>
              <th class="py-2 font-medium">Finalité</th>
            </tr>
          </thead>
          <tbody class="text-muted">
            <tr class="border-b border-line">
              <td class="py-2.5 pr-4"><code>actify_token</code></td>
              <td class="py-2.5 pr-4">Technique — exempté de consentement</td>
              <td class="py-2.5 pr-4">15 minutes</td>
              <td class="py-2.5">Jeton d'accès de votre session connectée.</td>
            </tr>
            <tr class="border-b border-line">
              <td class="py-2.5 pr-4"><code>actify_refresh</code></td>
              <td class="py-2.5 pr-4">Technique — exempté de consentement</td>
              <td class="py-2.5 pr-4">7 jours</td>
              <td class="py-2.5">Renouvellement de la session sans reconnexion.</td>
            </tr>
            <tr class="border-b border-line">
              <td class="py-2.5 pr-4"><code>actify_consent</code></td>
              <td class="py-2.5 pr-4">Préférence</td>
              <td class="py-2.5 pr-4">180 jours</td>
              <td class="py-2.5">Mémorise votre choix sur la mesure d'audience.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="text-muted text-sm leading-relaxed">
        La mesure d'audience repose sur Umami, un outil open source que nous
        hébergeons nous-mêmes sur le même VPS : aucune donnée n'est transmise à
        un tiers. Umami ne dépose aucun cookie, ne construit pas d'empreinte de
        navigateur exploitable entre sites et agrège des statistiques anonymes
        (pages vues, provenance, type d'appareil). Il n'est activé qu'après
        votre accord via le bandeau de consentement.
      </p>
      <p class="text-muted text-sm leading-relaxed">
        Vous pouvez retirer ou modifier votre choix à tout moment :
        <button type="button" class="text-accent hover:underline" @click="resetConsent">
          réafficher le bandeau de consentement
        </button>.
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
// Withdrawing consent must be as easy as giving it (CNIL): clearing the
// cookie brings the banner back. A prior acceptance keeps its effect until
// the next page load — the tracker script is already in the DOM.
const { consent } = useConsent()
function resetConsent() {
  consent.value = undefined
}

useHead({
  title: 'Politique de confidentialité',
  meta: [
    {
      name: 'description',
      content:
        'Politique de confidentialité d\'Actify : données traitées, blockchain XRPL, cookies, mesure d\'audience Umami et droits RGPD.',
    },
  ],
})
</script>
