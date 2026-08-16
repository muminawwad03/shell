# Shell

Shared responsibility (Mu'min Awwad, Moayad Naser, Danah AlDajani) — integration only, no product features of its own.

Composes the three microfrontends — `catalog` (Mu'min, Lit), `cart` (Moayad, React), `account` (Danah, Vue) — into one app by loading each one's **live deployed** JS bundle, not a local copy.

## Integration method: Web Components (+ iframe fallback per zone)

Each microfrontend is meant to deploy itself as a custom element (`catalog-app`, `cart-app`, `account-app`). The shell dynamically `import()`s each one's deployed script URL and drops the tag into the page. This was the method the group's brief recommended, and it's the natural fit for a mixed Lit/React/Vue team: whatever framework a component is built in, it compiles down to a plain custom element, and the shell doesn't need to know or care which framework was used underneath.

Not every member's app is exposed that way yet, though — `cart` (Moayad) is currently a plain React SPA that mounts itself into `#root`, with no custom element and no stable bundle filename. Rather than block on that, each zone in [`src/config/microfrontends.ts`](src/config/microfrontends.ts) declares its own `embedMode`: `"component"` for the dynamic-import path above, or `"iframe"` — just embeds the deployed page directly in an `<iframe>`, which needs zero changes on that member's side. `cart` uses `"iframe"` for now; swap it to `"component"` once `toy-store-cart` adds `react-to-webcomponent` (see the brief's resources list) and exposes a stable `cart-app.js`. Tradeoff: an iframed zone doesn't share the shell's routing/state — its internal navigation stays inside the iframe.

Both modes reuse the same "keep the element alive, just hide it" logic when switching tabs, so an iframe's in-progress state (e.g. items already in the cart) survives navigating away and back, same as a component-mode app would.

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

**Method used:** Web Components, per the group brief's recommendation for a mixed-framework team.

**Why:** No single framework runs across all three members, so the shell can't use e.g. React lazy-loading or Vue's async components directly. Plain custom elements are the one interface all three frameworks can target (React via `r2wc`, Vue via `defineCustomElement`, Lit natively), and the browser — not a meta-framework — handles mounting.

**One thing harder than expected:** getting a hidden-but-mounted microfrontend to actually disappear when switching tabs. The natural approach — toggling the `hidden` attribute — silently did nothing, because a component that sets its own `:host { display: block; }` (as `catalog-app` does) is an *author* style that outranks the *user-agent* stylesheet rule backing `[hidden] { display: none; }`. The fix was to toggle `element.style.display` inline instead, which has higher specificity than `:host`. Worth flagging to whoever builds `cart`/`account` too, since they'll hit the same thing if their root component also sets an explicit `display` on `:host`.

## Live URLs

- Shell: https://shell-six-murex.vercel.app
- Catalog: https://catalog-kappa-seven.vercel.app
- Cart: https://toy-store-cart.vercel.app (embedded via iframe)
- Account: _TBD_
