# Front-End Technical Interview Task: **Trading App**

### 1. Scope & Objective

Design a **production-grade React + TypeScript SPA** that lets a user monitor and trade a small set of crypto pairs (e.g., `BTC/USDT`, `ETH/USDT`, `SOL/USDT`). The core UI must embed TradingView’s Charting Library (not the lightweight widget) and stream real-time data from a public exchange WebSocket (Binance Spot API is fine). The task is intentionally scoped so you can **finish a solid MVP in ~12–16 h of focused work** while still showcasing architecture depth, code quality, and performance engineering.

---

### 2. Functional Requirements

1. **Instrument Selector**
    - Dropdown with at least three spot trading pairs.
    - Switching pairs must hot-swap every dependent component (chart, order book, ticker, PnL) without full reload.
2. **TradingView Candlestick Chart**
    - Integrate TradingView’s **Charting Library** via npm or local build.
    - Display 1 m, 5 m, 1 h, 4 h and 1 d candles. When the timeframe changes, fetch historical klines (REST) and resume WebSocket streaming for live updates.
    - Add at least one custom overlay drawn via the library API (e.g., VWAP or 9-period EMA).
3. **Live Order Book**
    - Top-20 bids/asks, aggregated to the nearest tick size.
    - Updates must push-render at ≥5 Hz with throttling / `requestAnimationFrame` so the UI stays >60 FPS.
    - Scroll virtualization or memoized rows—show us you know why React lists choke at scale.
4. **Trade Ticket (Limit Order)**
    - Price, size, side, and “post-only” toggle.
    - Validate client-side; reflect best bid/ask in real time.
    - Mock order acceptance locally (no private-key signing needed) and echo a status toast (“accepted”, “rejected”) within <250 ms.
5. **Positions & PnL Widget**
    - Simple table of open orders + mark-to-market unrealized PnL.
    - Persist to `localStorage` so a refresh restores state.
6. **Connectivity Resilience**
    - Auto-reconnect exponential back-off.
    - Queue incoming deltas while the chart reconnects, then fast-forward.

---

### 3. Technical Requirements

- **Tooling**
    - React 18, TypeScript ≥ 5.3, Vite 4 (or Next.js 14 app-router).
    - State layer: Redux Toolkit, Recoil, Zustand—your pick, but justify in an *Architecture Decision Record* (ADR).
    - Strict ESLint + Prettier + `typescript-eslint` + Husky pre-commit.
- **Data Layer**
    - Abstract exchange specifics behind `ExchangeAdapter` interface. Provide one concrete Binance implementation. Stubbing a second (`BybitAdapter`) earns bonus points.
    - Use a Web Worker for heavy price aggregation / PnL math so the main thread stays free.
- **Performance**
    - First Contentful Paint ≤ 1.5 s on a throttled 4× CPU, 3G network (`npm run lighthouse`).
    - No React renders >16 ms (watch Chrome DevTools Flamegraph).
- **Accessibility & UX**
    - Keyboard-navigable controls, ARIA roles on tables, prefers-color-scheme dark / light.
    - Responsive down to 390 px width—think phone landscape.
- **Testing**
    - Unit coverage ≥ 80 % with Vitest or Jest + React Testing Library.
    - One Playwright spec proving that an end-to-end order appears in the Positions widget.
- **Security**
    - CSP meta tag, `iframe sandbox` for TradingView injection, no unsafe-eval.
    - Sanitise any user input—even though order placement is mocked.

---

### 4. Deliverables

1. **GitHub repo** (public or private invite) structured:
    
    ```
    /src
      /adapters
      /components
      /hooks
      /pages
      /workers
      ...
    /docs
      ADR-0001-state-layer.md
    
    ```
    
2. **README** with:
    - 1-click Vercel (or Netlify) deploy badge.
    - `pnpm i && pnpm dev` quick-start.
    - Architecture diagram (text + Mermaid or PNG).
3. **Automated CI** (GitHub Actions) running lint, type-check, unit tests, Lighthouse CLI, and Playwright.
4. **Short Loom (≤5 min)** walk-through of decisions, gotchas, and next steps.

---

### 5. Stretch Goals (pick any; we love ambition)

- **Custom Pine Script indicator** injected into the TradingView instance.
- **Depth Chart** (area fill of aggregated order book).
- **Drag-and-drop layout** (react-grid-layout) with persisted user preferences.
- **Server-Side Event relay** using a tiny Fastify Node service that coalesces multiple exchanges into one stream.
- **Progressive Web App** with offline historical candles cache and install prompt.