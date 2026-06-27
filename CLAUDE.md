# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

The original product brief lives at `/Users/hamdan/Developer/CLAUDE.md` (DineFlow Agent Brief v3) for historical context. **The codebase has since been narrowed**: see "Scope" below for what is actually in this repo. Treat the brief as background, not as a spec.

## Scope (current)

Three ordering channels — no QR, no waiter mode, no tables:
- **desk** (`/desk`) — staff POS, cash + UPI, dine-in or takeaway
- **web** (`/order`) — UPI only, takeaway only, phone mandatory
- **kiosk** (`/kiosk`) — UPI only, dine-in or takeaway

Counter service everywhere. No `table_sessions`, no `staff_requests`, no QR/menu route. Loyalty is points-only: customer enters phone, earns 1 pt per ₹10, redeems 1 pt = ₹1. Coupons live in a `coupons` table with `validate_coupon()` RPC and an admin CRUD at `/admin/coupons`.

## Commands

```bash
npm run dev          # Vite dev server on :3000, uses .env.development (local Supabase)
npm run dev:remote   # Vite dev server pointed at hosted Supabase (.env.production)
npm run build        # Production build to dist/
npm run preview      # Serve the built dist/
```

Supabase (local stack runs in Docker via the CLI):

```bash
npx supabase start                 # boot local Postgres, API, Studio, Storage
npx supabase status                # shows local URL + anon key for .env.development
npx supabase db reset              # re-run all migrations + seed.sql (destructive)
npx supabase migration new <name>  # create a new migration in supabase/migrations/
npx supabase functions serve       # serve Edge Functions locally
npx supabase functions deploy <fn> # deploy one function (create-razorpay-order, razorpay-webhook, razorpay-refund-webhook, notify-order-ready)
npx supabase secrets set KEY=value # set Edge Function env (RAZORPAY_KEY_SECRET, TWILIO_*, etc.)
```

There is no test runner, linter, or typechecker configured. Don't invent npm scripts that don't exist in `package.json`.

## Environment files

Three env files, all loaded by Vite based on mode:
- `.env` — shared values (e.g. `VITE_RAZORPAY_KEY_ID`).
- `.env.development` — used by `npm run dev`; points `VITE_SUPABASE_URL` at `http://127.0.0.1:54321`.
- `.env.production` — used by `npm run build` and `npm run dev:remote`; points at hosted Supabase.

`.env.example` documents every variable, including Edge Function secrets that are set via `supabase secrets set` (not Vite). `ALLOW_RAZORPAY_SIMULATE=true` enables the dev-only "Simulate payment" path in `razorpay-webhook` — it must never be set in production.

## Architecture

### Route → zone model (`src/App.jsx`)

All routes live under one SPA. `ZoneApplier` sets `document.body[data-zone]` to `customer | kitchen | staff` based on the URL prefix; CSS keys off this to switch visual treatments (notably the dark KDS palette in `tailwind.config.js` under `kds.*`).

Staff routes (`/kitchen`, `/desk`, `/admin/*`) are wrapped in `RequireRole`, which gates on `app_metadata.role` from Supabase Auth. Customer routes (`/order`, `/kiosk`) submit orders through Edge Functions only — the `anon` role no longer writes to `orders` directly.

All page components are lazy-loaded; the `Suspense` fallback is `<LoadingSpinner fullscreen />`.

### Settings drive everything (`src/lib/SettingsContext.jsx`)

`restaurant_settings` is a single row. `SettingsProvider` loads it on mount with a 2.5s timeout fallback (so the app still mounts when Supabase is unreachable) and subscribes to realtime UPDATEs. `useSettings()` returns a flat object with camelCase keys — `kioskEnabled`, `webOrderingEnabled`, `deskEnabled`, `loyaltyEnabled`, `cashEnabled`, `gstRate`, `gstInclusive`, `gstin`, `themeConfig`.

When a channel toggle is off, the matching route renders `<ClosedPage />` instead of the order flow. When `loyaltyEnabled` is off, `CheckoutAdjustments` hides the phone/points UI but still allows coupon entry.

### Auth and roles (`src/lib/AuthContext.jsx`)

Roles are read from `user.app_metadata.role`, **not** `user_metadata` (which users can edit). Migration `013_auth_role_app_metadata.sql` establishes this; RLS policies also key off `app_metadata.role`. When wiring a new staff feature, gate the UI with `RequireRole` and add a matching RLS policy — never rely on client-side checks alone.

### Data flow

- React Query (`@tanstack/react-query`) is the cache layer; default `staleTime: 30s`, `retry: 1`. Custom hooks in `src/hooks/` (`useMenu`, `useOrders`, `useCart`) wrap Supabase queries and realtime subscriptions.
- Single `supabase` client in `src/lib/supabase.js`. Realtime is throttled to 10 events/sec.
- The KDS, desk, and admin order board all subscribe to `orders` realtime changes — don't bypass these by polling.

### Payment flow (Razorpay)

1. Client calls Edge Function `create-razorpay-order` with the cart. The function **re-prices server-side** — never trust client totals.
2. Function returns `razorpay_order_id` and `upi_intent_url` (or `null` in sandbox without `UPI_VPA`).
3. Client opens the UPI intent (real flow) or hits the simulate button (dev).
4. `razorpay-webhook` verifies the HMAC signature and inserts the `orders` row as `pending`. For kiosk and web, **no order row exists until the webhook fires** — use client-side temporary state while waiting.
5. Refunds go through `razorpay-refund-webhook`, which updates `refunds.status`.

The `create-razorpay-order` function also re-validates any `coupon_code` against the `validate_coupon` RPC and caps `loyalty_points_to_redeem` to the customer's actual balance — never trust the client.

### Desk cash flow (no Razorpay)

Desk cash orders go through the `create_desk_cash_order` RPC, which prices the cart, re-validates any coupon, deducts redeemed points, inserts the order + payment + audit row, and calls `award_loyalty_for_order()` — all in one transaction.

### Database layer

Migrations in `supabase/migrations/` are ordered and idempotent within their own file. Notable ones:
- `008_triggers.sql` — atomic ingredient deduction/restock triggers. Do not move this logic into Edge Functions.
- `009_rls.sql` — base RLS; every table has policies, no exceptions.
- `013_auth_role_app_metadata.sql` — the `app_metadata.role` switch.
- `015_variants_modifications.sql` — menu item variants/modifiers.
- `017_desk_cash_pos.sql` + `018_desk_channel_audit_fixes.sql` — desk POS RPCs (`create_desk_cash_order`, `settle_cash_order`, `cancel_paid_cash_order`, `reprint_order_invoice`).
- `020_drop_tables_waiter_qr.sql` — the cleanup migration: drops `tables`, `table_sessions`, `staff_requests`, the QR channel, waiter mode, and the unused `loyalty_method` enum; adds the `coupons` table + `validate_coupon()` + `award_loyalty_for_order()` RPCs; reissues `create_desk_cash_order` with phone/coupon/points support.

Earlier migrations 005, 012, 014 still exist for history but their objects are dropped by 020 — don't reference them in new code.

`seed.sql` runs after migrations on `db reset` and assumes the single `restaurant_settings` row already exists from migration 002.

### PWA

`vite-plugin-pwa` with `registerType: 'autoUpdate'`. The manifest is `public/manifest.webmanifest` (passed via `manifest: false` in `vite.config.js`). Workbox caches Supabase Storage menu photos (`CacheFirst`, 7-day TTL) and falls back to `/offline.html` only for customer-facing routes (`/order`, `/kiosk`). Staff/admin routes intentionally are not in the offline allowlist.

### Print agent

`print-agent/` is a separate Node.js app meant to run on a counter machine. It is currently empty in this repo — when implemented, it polls `print_jobs` and renders ESC/POS. The agent uses the service role key in a local config file; that key must never enter the PWA bundle.

## Styling conventions

Tailwind tokens in `tailwind.config.js` are the source of truth for color:
- `brand.*` — orange brand palette.
- `ink.*` / `surface.*` — neutral text/background scales for customer + admin.
- `kds.*` — dark palette for the kitchen display.
- `status.*` — one color per `orders.status` value; reuse these instead of hardcoding hex.

Fonts: `font-display` (Plus Jakarta Sans) for headings, `font-body` (Inter) for body. Custom animations (`sheet-up`, `modal-in`, `toast-in`, `pulse-soft`, `shimmer`, `flash-pending`) are defined in the Tailwind config — prefer them over ad-hoc keyframes.

## Design context

Strategic register and principles for this project live in `PRODUCT.md` (project root). Read it before any non-trivial UI work. Quick reference:

- **Register**: product (app UI / tools), not brand / marketing.
- **Personality**: capable, tactile, operational. Kitchen-line voice, not boardroom.
- **Five principles**:
  1. One tap, no detour — every staff-side primary action reachable in one tap.
  2. Channel-aware, not channel-uniform — desk / kiosk / web share data, not flow.
  3. Material vocabulary, not SaaS vocabulary — extend dockets, ledger rows, channel chips, operator strip; don't reach for generic cards.
  4. Money is mono, status is color, time is text — JetBrains Mono + tabular-nums for currency / totals / dwell time; `status.*` palette for order state; plain text for relative time.
  5. Staff under pressure is the design target — 48px tap targets, high contrast, no animation that costs a frame of attention.
- **Anti-references**: Toast / Square POS dashboards, Stripe / Vercel admin starter kits, glassmorphism / gradient text / side-stripe alerts, cream-and-one-accent editorial defaults.
- **A11y baseline**: WCAG 2.1 AA across all surfaces; reduced motion respected globally (already in `index.css`); color is never the only signal.

DESIGN.md (visual tokens) is not yet generated; run `/impeccable document` to capture the Tailwind config + `index.css` system into a single visual reference. The `/impeccable` skill auto-loads PRODUCT.md (and DESIGN.md once it exists) for every UI command.
