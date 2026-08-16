import { LitElement, css, html } from 'lit';
import { customElement, query, state } from 'lit/decorators.js';
import '@material/web/typography/md-typescale-styles.js';
import themeTokensCss from './styles/theme.css?inline';
import { MICROFRONTENDS, matchZone, type MicrofrontendConfig } from './config/microfrontends.js';

const THEME_STYLE_ID = 'shell-theme-tokens';
if (!document.getElementById(THEME_STYLE_ID)) {
  const style = document.createElement('style');
  style.id = THEME_STYLE_ID;
  style.textContent = themeTokensCss;
  document.head.appendChild(style);
}

/**
 * Integration shell: composes the 3 microfrontends' live deployed bundles
 * into one experience via Web Components.
 *
 * Routing: the shell owns the URL *pathname* ("/", "/cart", "/account") to
 * pick which microfrontend is mounted. Each microfrontend is free to use
 * the URL *hash* for its own internal routing (catalog does) without the
 * two routers ever conflicting, since pathname and hash are independent.
 *
 * Loading: a microfrontend's script is dynamically imported (once, then
 * cached) the first time its zone is visited; its custom element instance
 * is created once and kept alive (just hidden) when navigating away, so
 * in-progress state (e.g. a filled search box) isn't lost when switching
 * tabs and back.
 */
@customElement('shell-app')
export class ShellApp extends LitElement {
  @state()
  private _pathname = window.location.pathname;

  @state()
  private _loadError: string | null = null;

  @query('#mount')
  private _mount!: HTMLDivElement;

  private _loadedScripts = new Set<string>();
  private _elements = new Map<string, HTMLElement>();

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    header {
      display: flex;
      align-items: center;
      gap: var(--app-space-6);
      padding: var(--app-space-4) var(--app-space-6);
      background: var(--md-sys-color-surface);
      border-bottom: 1px solid var(--md-sys-color-outline-variant);
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .brand {
      font-weight: 700;
      font-size: 1.15rem;
      color: var(--md-sys-color-primary);
    }

    nav {
      display: flex;
      gap: var(--app-space-4);
      margin-inline-start: auto;
    }

    nav a {
      color: var(--md-sys-color-on-surface-variant);
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 500;
      padding: var(--app-space-2) var(--app-space-3);
      border-radius: var(--md-sys-shape-corner-small);
    }

    nav a.active {
      color: var(--md-sys-color-on-primary-container);
      background: var(--md-sys-color-primary-container);
    }

    main {
      flex: 1;
    }

    #mount:empty {
      display: none;
    }

    .placeholder {
      max-width: 640px;
      margin: var(--app-space-8) auto;
      padding: var(--app-space-8);
      text-align: center;
      color: var(--md-sys-color-on-surface-variant);
      border: 1px dashed var(--md-sys-color-outline-variant);
      border-radius: var(--md-sys-shape-corner-large);
    }

    .error {
      max-width: 640px;
      margin: var(--app-space-8) auto;
      padding: var(--app-space-6);
      color: var(--md-sys-color-on-error-container);
      background: var(--md-sys-color-error-container);
      border-radius: var(--md-sys-shape-corner-large);
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('popstate', this._onPopState);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('popstate', this._onPopState);
  }

  private _onPopState = () => {
    this._pathname = window.location.pathname;
  };

  private _navigate(e: Event, path: string) {
    e.preventDefault();
    if (this._pathname === path) return;
    window.history.pushState({}, '', path);
    this._pathname = path;
  }

  updated() {
    this._syncMount();
  }

  private async _syncMount() {
    const zone = matchZone(this._pathname);
    this._loadError = null;

    // Hide every previously-mounted microfrontend element. Each app sets
    // its own `:host { display: ... }`, which — being an author style —
    // beats the UA stylesheet rule for the `hidden` attribute, so this
    // sets `display` inline instead (higher specificity than :host).
    for (const el of this._elements.values()) {
      el.style.display = 'none';
    }

    if (!zone.scriptUrl) {
      // No live URL configured yet — placeholder handles rendering.
      return;
    }

    try {
      if (!this._loadedScripts.has(zone.scriptUrl)) {
        this._loadedScripts.add(zone.scriptUrl);
        await import(/* @vite-ignore */ zone.scriptUrl);
      }

      let el = this._elements.get(zone.key);
      if (!el) {
        el = document.createElement(zone.tag);
        this._elements.set(zone.key, el);
        this._mount.appendChild(el);
      }
      el.style.display = '';
    } catch (err) {
      this._loadedScripts.delete(zone.scriptUrl);
      this._loadError = `Failed to load "${zone.label}" from ${zone.scriptUrl}: ${(err as Error).message}`;
      this.requestUpdate();
    }
  }

  private _renderNavLink(mf: MicrofrontendConfig) {
    const isActive = matchZone(this._pathname).key === mf.key;
    return html`<a
      href=${mf.path}
      class=${isActive ? 'active' : ''}
      @click=${(e: Event) => this._navigate(e, mf.path)}
      >${mf.label}</a
    >`;
  }

  render() {
    const zone = matchZone(this._pathname);
    const showPlaceholder = !zone.scriptUrl && !this._loadError;

    return html`
      <header>
        <span class="brand">Store</span>
        <nav>${MICROFRONTENDS.map((mf) => this._renderNavLink(mf))}</nav>
      </header>
      <main>
        <div id="mount"></div>
        ${showPlaceholder
          ? html`<div class="placeholder">
              <p><strong>${zone.label}</strong> isn't wired up yet.</p>
              <p>
                Set <code>VITE_${zone.key.toUpperCase()}_URL</code> in <code>.env.local</code> to
                that member's deployed <code>${zone.tag}</code> bundle URL.
              </p>
            </div>`
          : ''}
        ${this._loadError ? html`<div class="error">${this._loadError}</div>` : ''}
      </main>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'shell-app': ShellApp;
  }
}
