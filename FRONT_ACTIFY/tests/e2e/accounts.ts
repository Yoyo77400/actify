export interface E2eAccount {
  seed: string
  address: string
  /** Only needed by the wallets handed to the API; specs never read it. */
  publicKey?: string
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
export const E2E_ADMIN: E2eAccount = {
  seed: 'sEdT2DMna88M6GTa8J4oEGbKHQJphKb',
  publicKey: 'EDEB2CC3D1715AABE5DD74354C8F265C79E8101992E4CEFA05A12B5F541F0E7CE0',
  address: 'rUHZDdau4Z4XZYoxa3aLbf8qCtdLa8wDAD',
}

/**
 * One wallet pool per scenario — and one wallet per *attempt* inside it.
 *
 * The e2e API keeps a single pglite database alive for the whole Playwright
 * run, so a spec that signs up leaves that account behind. Reusing one fixed
 * wallet made specs order-dependent AND made retries lie: the retry replayed
 * against an account that already existed, so "new wallet → /auth/register"
 * failed for a reason unrelated to the original failure.
 *
 * The `wallet` fixture indexes these by testInfo.retry, so every attempt starts
 * from a genuinely unknown wallet and assertions can stay strict.
 */
export const WALLET_POOLS = {
  auth: [
    { seed: 'sEd76jR9pxN3gn6fCnaq6mYSh7445i1', address: 'r96fusbxG1YW5GE2qKFV5xrTTnSaMQgPDd' },
    { seed: 'sEd7GKjEkVUg7X8ErQGDfEZ8zr6rozF', address: 'rUUtFjp9hnNsiMz3jmTjYgocDDw1FHKFd9' },
    { seed: 'sEd74fAGFb7nRE3EdG311VD6XYir3ue', address: 'rPKBYazxZCpmw7Ey4AMZKNXwdToySgYBKS' },
  ],
  signup: [
    { seed: 'sEd7KsXkzi36diRSVdotbbyYndUSYFC', address: 'ra1wDwR1X64XePxQ1qfqzd4eARnHWeZxZN' },
    { seed: 'sEdTURSN1ge7hNiYESi6aQD6jfLf5ph', address: 'rsCFjCc2Eazu8Ty6BgHEL9uSJuEtJz7oyL' },
    { seed: 'sEd7P8k9zWgvfovUrhrBJtvUhkvEw2K', address: 'riMMMAip1iKChh14rEM7zYoyng2dWdRma' },
  ],
  totp: [
    { seed: 'sEdTqzjyrYfaLxdh78FtUoR3GdvY5bd', address: 'rdRFvRHm1Jed1jbZ8TnectKQ2CAJeX9A5' },
    { seed: 'sEdSSc4vuWyT5nLGoQp4xLePuA3vxb4', address: 'rPFtiyeYrm63V3c3KrxmVX3UyMHJX8qJnK' },
    { seed: 'sEdStaPpmUPcTgF9nXJ9mpeREKb2kye', address: 'rsmrwyT9HVMB9aEEX3BVoQxsxPV2jjgKQg' },
  ],
  export: [
    { seed: 'sEdSkMTXLFqwJD5iNCmHA5bLG1tafJ6', address: 'rhbg4dde5Zg7GmyziqYNZ5qRRju5tDeG7L' },
    { seed: 'sEdVGAYccmqXAHFqRXLqZqAp4BRrECW', address: 'rn2nnqRzUfwx4VYhZhXPqrvQ2sLGm12Xq6' },
    { seed: 'sEdTU2HXyEiwHe6xA8BVBH9ZbuJ9sNs', address: 'rhoEmGj7xmornJfeUXwmsnqZLkY8rwJhCf' },
  ],
  delete: [
    { seed: 'sEdSgQUWadrW7tW1Crxvzc9mbU9FQam', address: 'rhXhyk2aDKPSPYaHwUijcFuJPsMStWr7sH' },
    { seed: 'sEdVGKUxd8Z6APeuezWeSozTct86Zpj', address: 'rwMwU9bkFUGUedau6yJrZ3i8Sev5RCWpxm' },
    { seed: 'sEd71bCWgB6Us7btWoji1dNxie95LVA', address: 'rBvDGR3fSEnFSUJQVdNTaPW76GCVyPXHr7' },
  ],
  // Two roles per attempt (artist, follower) — indexed [retry*2] / [retry*2+1]
  // in artists-follow.spec.ts, rather than one wallet per attempt like the
  // pools above.
  artists: [
    { seed: 'sEdTtNqvJVRw6ZQSAvhX3RRTcZXTFuB', address: 'r98nwMMrPVCmocHBmxJCD2YbPcD9bpyyzc' },
    { seed: 'sEdSbBL6DNC7Gt7FEN1bafWxVQvRq8p', address: 'rwbM6G7fjxP3qADjEByBWv3nbQ1vRLzBzY' },
    { seed: 'sEdTxVxK9iDXtGDZQdQvQJR5md5u6yQ', address: 'rhLvPEtEsYzXLSrZ6aG5Qbj2WyDTHyYw3H' },
    { seed: 'sEdTvxj9q5TX7wctNvTHD9apxcGJ8cJ', address: 'r4ddzqMm2iJ7c2JT21nHLdV6hUPnTibhGY' },
    { seed: 'sEdVhj3GFuqQYjtNSMz6geCtG3Pf8Fn', address: 'rLTNpe9MSfLgm32gW17fyPxmhGHcD764ea' },
    { seed: 'sEdSSJLMXrWGEF3WfPCk3pHNkmG4PoM', address: 'rDrVd6UvrhL9aj4mvJjSQxCWzwKPefBZiK' },
  ],
} satisfies Record<string, E2eAccount[]>
