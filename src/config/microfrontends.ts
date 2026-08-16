export interface MicrofrontendConfig {
  key: 'catalog' | 'cart' | 'account';
  label: string;
  /** URL path prefix this zone owns in the shell, e.g. "/" or "/cart". */
  path: string;
  /** Custom element tag name the microfrontend registers, e.g. "catalog-app". */
  tag: string;
  /**
   * Full URL to the microfrontend's deployed JS entry (an ES module that
   * registers `tag` as a custom element as a side effect). Read from a
   * Vite env var so each deploy target (local dev / preview / prod) can
   * point at a different live URL without code changes. `undefined`
   * means "not deployed yet" — the shell shows a placeholder instead.
   */
  scriptUrl: string | undefined;
}

// Set these in a local .env file, e.g.:
//   VITE_CATALOG_URL=http://localhost:5173/src/main.ts   (Mu'min's dev server)
//   VITE_CART_URL=https://cart-<member>.vercel.app/cart-app.js
//   VITE_ACCOUNT_URL=https://account-<member>.vercel.app/account-app.js
export const MICROFRONTENDS: MicrofrontendConfig[] = [
  {
    key: 'catalog',
    label: 'Shop',
    path: '/',
    tag: 'catalog-app',
    scriptUrl: import.meta.env.VITE_CATALOG_URL,
  },
  {
    key: 'cart',
    label: 'Cart',
    path: '/cart',
    tag: 'cart-app',
    scriptUrl: import.meta.env.VITE_CART_URL,
  },
  {
    key: 'account',
    label: 'Account',
    path: '/account',
    tag: 'account-app',
    scriptUrl: import.meta.env.VITE_ACCOUNT_URL,
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
