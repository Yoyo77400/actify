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

// One wallet per scenario. The e2e API runs a single pglite database for the
// whole Playwright run, so specs sharing a wallet would share an account and
// depend on execution order — each destructive/stateful spec gets its own.
export const E2E_SIGNUP: E2eAccount = {
  seed: 'sEd7pPzvCHBnio4D6Evs9FzbitR3aSo',
  publicKey: 'ED65B511778561F4873AACA18236CBA415EC5BB21F8AD172E4A8CEF72DA5B4B32D',
  address: 'rAgo9eDFmP3oxnrnXrzfJvhqy3DxUwrCZ',
}

export const E2E_TOTP: E2eAccount = {
  seed: 'sEdTGXyhmbmoqef2re8STL9ATZjxvxv',
  publicKey: 'EDDD51148822191EB17F32CBD6A2D2C60C69795F2D86C540EC676EECF9009E432B',
  address: 'rnxWEy2sNK5MCPBEYKukMaF7uqJBtzNNdb',
}

export const E2E_EXPORT: E2eAccount = {
  seed: 'sEdVbRsG4VzevssfaJwtnEhpZxreRKu',
  publicKey: 'EDB11E27CD9CBC7D55DD55EFCAD4F35CAA3ACD6AA509DAAEF8C758E74AAFAE9BA2',
  address: 'rJ2NG3EPKyRf9qsEZ2iTov8HaGmDjFXMTA',
}

export const E2E_DELETE: E2eAccount = {
  seed: 'sEd7yJec2Nhqcv1AQ9nHZ3udschkv5K',
  publicKey: 'ED9114A02D608D3E18D25929FF403DCBAEB93BE06202B3CE7A7F2EEF326C3D2738',
  address: 'rUBi3WG7vZ9bhSMvZivxUReBDQ9Jd5XzRA',
}
