export interface E2eAccount {
  seed: string
  address: string
  publicKey: string
}

// Fixed XRPL test accounts (deterministically derived from the seeds below via
// ripple-keypairs). Kept as plain precomputed data on purpose: importing
// ripple-keypairs here would drag it into Playwright's config loader, which
// can't handle that package's CJS/ESM interop. The actual signing runs
// in-browser with the app's own bundled ripple-keypairs (app/lib/wallets/e2e.ts);
// the test side only needs these strings.
//
// The admin address is handed to the API (ADMIN_WALLET_ADDRESS) so this wallet
// is auto-promoted to admin on first login — see wallets.service.ts.
//
// To regenerate: node -e 'const k=require("ripple-keypairs");const s=k.generateSeed();const p=k.deriveKeypair(s).publicKey;console.log(s,p,k.deriveAddress(p))'
export const E2E_USER: E2eAccount = {
  seed: 'sEdT61iCQfFXAQuWJQewgyez4KkYQag',
  publicKey: 'EDA688F74BB368316F3D10DFEFC5BF8B1A313332C1CF0BA9CC8C1E0AA16EE40322',
  address: 'rGGvbApHGmvFvB8Uze42TzAXEjEaGVtYTv',
}

export const E2E_ADMIN: E2eAccount = {
  seed: 'sEdT2DMna88M6GTa8J4oEGbKHQJphKb',
  publicKey: 'EDEB2CC3D1715AABE5DD74354C8F265C79E8101992E4CEFA05A12B5F541F0E7CE0',
  address: 'rUHZDdau4Z4XZYoxa3aLbf8qCtdLa8wDAD',
}
