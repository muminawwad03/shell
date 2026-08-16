# Shell

Shared responsibility (Mu'min Awwad, Moayad Naser, Danah AlDajani) — integration only, no product features of its own.

Composes the three microfrontends — `catalog` (Mu'min, Lit), `cart` (Moayad, React), `account` (Danah, Vue) — into one app by loading each one's **live deployed** JS bundle, not a local copy.

## Integration method: Web Components for catalog/account, iframe for cart

Both are methods the group's brief explicitly names as valid, and the shell mixes them per zone rather than forcing every member onto the same one — each zone in [`src/config/microfrontends.ts`](src/config/microfrontends.ts) declares its own `embedMode`:

- **`"component"`** (`catalog`, `account`): the microfrontend deploys itself as a custom element (`catalog-app`, `account-app`); the shell dynamically `import()`s its script URL and drops the tag in. Natural fit for Lit (already a custom element) and Vue (`defineCustomElement`) — no framework lock-in for the shell.
- **`"iframe"`** (`cart`): the deployed page is embedded directly in an `<iframe>`, unmodified. Zero coupling — `toy-store-cart` is a normal React SPA and stays that way. The brief lists this as the option that "always works — frameworks never touch each other," at the cost of no shared routing/state across the boundary (a `CustomEvent` dispatched inside the iframe's document, for instance, never reaches the shell's document — only `postMessage` crosses that line, and this integration doesn't need it).

Both modes reuse the same "keep the element/iframe alive, just hide it" logic when switching tabs, so cart's in-progress state (items already added) survives navigating away and back.

## How routing doesn't collide

The shell owns the URL **pathname** (`/`, `/cart`, `/account`) to decide which microfrontend to show. Each microfrontend is free to use the URL **hash** for its own internal navigation (catalog does: `#/products/:id`) without the two routers ever fighting over the same piece of state — pathname and hash are independent parts of the URL.

## Configuration

Microfrontend URLs are read from Vite env vars, defined in [`src/config/microfrontends.ts`](src/config/microfrontends.ts):

```
VITE_CATALOG_URL=https://.../catalog-app.js
VITE_CART_URL=https://.../cart-app.js
VITE_ACCOUNT_URL=https://.../account-app.js
```

Copy `.env.example` to `.env.local` and fill in each member's deployed URL as it becomes available. A zone with no URL configured shows a "not wired up yet" placeholder instead of erroring.

## Local integration testing

```bash
# in ../catalog
npm run build && npm run preview   # serves dist/catalog-app.js on :4173

# in ./shell — .env.local already points VITE_CATALOG_URL at localhost:4173
npm install
npm run dev
```

## Design system

Shared Material 3 color/type/spacing tokens live in [`src/styles/theme.css`](src/styles/theme.css), copied from the `catalog` repo and injected globally by the shell at runtime (not via a static `<link>`, so it applies the same way in dev, preview, and once embedded). Each member's repo also injects its own copy the same way for standalone deploys — see the "harder than expected" note below for why this isn't fully centralized.

## Integration notes

**Method used:** Web Components for `catalog`/`account`, iframe for `cart` — a deliberate per-zone mix, both methods pulled straight from the brief's own options rather than one enforced choice.

**Why:** No single framework runs across all three members, so the shell can't use e.g. React lazy-loading or Vue's async components directly. Custom elements are the interface `catalog` and `account` can both target (Lit natively, Vue via `defineCustomElement`) without the shell needing to know which framework is underneath. `cart` stays a plain React SPA behind an iframe — the point of the assignment is three different frameworks working together, and iframe composition already achieves that with zero coupling, so there was no reason to make Moayad restructure `toy-store-cart` just to fit one integration style.

**One thing harder than expected:** getting a hidden-but-mounted microfrontend to actually disappear when switching tabs. The natural approach — toggling the `hidden` attribute — silently did nothing, because a component that sets its own `:host { display: block; }` (as `catalog-app` does) is an *author* style that outranks the *user-agent* stylesheet rule backing `[hidden] { display: none; }`. The fix was to toggle `element.style.display` inline instead, which has higher specificity than `:host`. Applies to `account` too if its root component sets an explicit `display` on `:host`; doesn't apply to `cart` since the iframe itself (not a custom element) is what gets hidden.

## Live URLs

- Shell: https://shell-six-murex.vercel.app
- Catalog: https://catalog-kappa-seven.vercel.app
- Cart: https://toy-store-cart.vercel.app (embedded via iframe)
- Account: _TBD_
