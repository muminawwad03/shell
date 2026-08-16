export interface MicrofrontendConfig {
  key: 'catalog' | 'cart' | 'account';
  label: string;
  /** URL path prefix this zone owns in the shell, e.g. "/" or "/cart". */
  path: string;
  /**
   * How this zone is composed:
   * - "component": dynamically import `url` (an ES module that registers
   *   `tag` as a custom element as a side effect) and mount `tag`.
   * - "iframe": embed `url` directly in an <iframe>, unmodified — no
   *   custom element required from that member. Used deliberately for
   *   `cart`, not as a stopgap: zero coupling to a plain React/Vue SPA,
   *   at the cost of no shared routing/state with the rest of the shell
   *   (per the project brief's iframe-composition tradeoff).
   */
  embedMode: 'component' | 'iframe';
  /** Custom element tag name — required when embedMode is "component". */
  tag?: string;
  /**
   * Live deployed URL for this zone: a JS entry (component mode) or a
   * page URL (iframe mode). Read from a Vite env var so each deploy
   * target can point at a different live URL without code changes.
   * `undefined` means "not deployed yet" — the shell shows a placeholder.
   */
  url: string | undefined;
}

// Set these in a local .env file, e.g.:
//   VITE_CATALOG_URL=http://localhost:5173/src/main.ts   (Mu'min's dev server, component mode)
//   VITE_CART_URL=https://toy-store-cart.vercel.app        (Moayad, iframe mode — his deployed page URL)
//   VITE_ACCOUNT_URL=https://account-<member>.vercel.app/account-app.js  (Danah, component mode)
export const MICROFRONTENDS: MicrofrontendConfig[] = [
  {
    key: 'catalog',
    label: 'Shop',
    path: '/',
    embedMode: 'component',
    tag: 'catalog-app',
    url: import.meta.env.VITE_CATALOG_URL,
  },
  {
    key: 'cart',
    label: 'Cart',
    path: '/cart',
    // toy-store-cart is a plain React SPA — embedded as-is via iframe,
    // by design (see MicrofrontendConfig.embedMode docs above).
    embedMode: 'iframe',
    url: import.meta.env.VITE_CART_URL,
  },
  {
    key: 'account',
    label: 'Account',
    path: '/account',
    embedMode: 'component',
    tag: 'account-app',
    url: import.meta.env.VITE_ACCOUNT_URL,
  },
];

export function matchZone(pathname: string): MicrofrontendConfig {
  // Longest path prefix wins so "/" doesn't shadow "/cart" or "/account".
  const sorted = [...MICROFRONTENDS].sort((a, b) => b.path.length - a.path.length);
  return (
    sorted.find((mf) => mf.path !== '/' && pathname.startsWith(mf.path)) ??
    MICROFRONTENDS.find((mf) => mf.path === '/')!
  );
}
