# Product

## Register

product

## Users

**Restaurant owner / admin** — small independent restaurants and food courts (India, post-2024). Sets up the menu, configures service style, watches the day from the dashboard, closes the till at end of day. Cares about cost (replacing ₹2L+ legacy POS), GST compliance, and one console that surfaces what's selling, what's running low, and what cash is unaccounted for.

**Counter / desk staff** — the human payment hub. Takes orders for walk-in guests, seats tables, confirms cash collected from QR/kiosk customers, processes UPI refunds, prints invoices. Under pressure during peak. Needs one-tap actions, no nested menus, no second-guessing.

**Waiter** (when `service_style = waiter_service`) — owns the table from seating to bill. Reads the floor map, picks up bill requests, calls back to the kitchen, settles up at the desk.

**Kitchen staff** — eyes on the KDS the whole shift. Taps a card to advance state (accepted → preparing → ready). Reads at a glance from 2 m away. Hears the alert when a new ticket lands.

**Diner** — three contexts:
- QR table: arrives at a seated table, scans the QR code on the table tent, browses on their own phone. Wants to order fast and (for counter-service) pay before the food's made.
- Kiosk: standing at a tablet, wants to choose dine-in or takeaway, pay by UPI, walk away.
- Web / remote: at home or office. Wants takeaway by UPI, will pick up later.

## Product Purpose

DineFlow is a PWA-based restaurant operations system that runs a small restaurant or food court on one Supabase instance: ordering, kitchen display, payments, ingredient-level inventory, WhatsApp notifications, thermal printing (via a local companion app), GST-compliant invoices, and end-of-day Z reports.

The strategic ambition: replace fragmented legacy POS hardware + cloud-POS subscriptions (Petpooja, Posist, Toast clones) with a single browser-installable app that any restaurant can self-host. One Supabase. One stack. Three ordering channels (QR, kiosk, web) that all feed the same kitchen and the same desk.

Success looks like:
- A waiter-service restaurant runs a full lunch service without staff needing to touch a separate cash register.
- A counter-service kiosk takes a UPI-only order start-to-finish, with no staff involvement at all, in under 90 seconds.
- The owner can generate a Z report at close and hand it to their CA the next morning.

This is also a thesis project — the implementation has to be defensible, complete enough to demo end-to-end, and architecturally honest about its trade-offs.

## Brand Personality

**Three words: capable, tactile, operational.**

Voice: kitchen line, not boardroom. Numbers are mono, money is loud, status changes are immediate. No marketing slop, no "delight" for its own sake. Where there's warmth, it's the warmth of a busy restaurant, not the warmth of a wellness app.

Visual mood: KOT dockets with perforated edges, ledger rows with dotted leaders, channel chips that look like rail tags on a board, a deep-ink operator strip that lives at the desk. The brand orange (Tailwind `#EA580C`) is appetite-cue on customer surfaces and accent-only on staff surfaces. Mono numerics carry money, time-on-table, and order totals.

Emotional goals by surface:
- Customer (menu, kiosk, web): appetizing, fast, frictionless. Photos sell, prices read clean.
- Kitchen (KDS): readable, glanceable, dark. No decoration that costs a tick of attention.
- Staff (desk, admin): controlled and dense. The operator feels in charge of the room.

## Anti-references

- **Toast POS / Square Dashboard** — the gradient-accented "modern restaurant SaaS" template. Hero metric cards stacked four-wide, generic activity feeds, candy-colored badges. We do not look like a marketing site dressed as a POS.
- **Stripe / Vercel admin starter kits** — fintech-navy and rounded white cards on white. Not our register; this is a back-of-house tool, not a developer settings panel.
- **Glassmorphism, gradient text, side-stripe alerts** — the saturated AI tells. We have an actual material language (dockets, ledger rows, mono numerics, operator strip); use that vocabulary instead of the trends.
- **Foodora / Zomato consumer apps for the staff side** — bright, busy, social-feed energy. Wrong for kitchen and desk. Their customer-app shape can inform our customer menu, but not staff surfaces.
- **Cream / sand / linen body backgrounds with one accent** — the editorial-restaurant AI default. We are not that restaurant. Our warmth is in the dockets and the orange, not in tinted body chrome.

## Design Principles

1. **One tap, no detour.** Every staff-side primary action is reachable in one tap from the surface they're already on. KDS state change, desk cash confirm, table seat, void item — never bury behind a menu.

2. **Channel-aware, not channel-uniform.** QR, kiosk, web, and desk share data but not flow. Counter-service QR asks for UPI before kitchen. Waiter-service QR fires straight to kitchen. Kiosk is always UPI. Don't smooth these differences into one generic ordering flow — the differences are the product.

3. **Material vocabulary, not SaaS vocabulary.** We already have dockets, ledger rows, channel chips, the operator strip. New surfaces extend that vocabulary instead of reaching for generic cards and pill badges. If a component would look at home in a Vercel dashboard, it doesn't belong here.

4. **Money is mono. Status is color. Time is text.** Currency, totals, line items, table dwell time → JetBrains Mono with tabular-nums. Order state → `status.*` palette tokens. Relative time → plain text. Don't mix the three; each carries a single meaning.

5. **Staff under pressure.** The kitchen at 1:20pm on a Saturday is the design target. Minimum 48px tap targets. High contrast. No animation that costs a frame of attention. Customer surfaces can breathe; staff surfaces are dense and direct.

## Accessibility & Inclusion

- **WCAG 2.1 AA across all surfaces** (from project hard rules in CLAUDE.md). Body text ≥ 4.5:1 against background; large/bold ≥ 3:1.
- **Keyboard-first staff surfaces.** Desk and KDS are operated by hand or stylus; every primary action also keyboard-reachable with visible focus rings. The `.kbd` style + visible focus ring in `index.css` is the foundation.
- **Minimum 48 px tap targets.** Built into `.touch-target` / `.touch-target-xl`; enforce on every interactive element.
- **Reduced motion is respected globally** (`@media (prefers-reduced-motion: reduce)` already in `index.css`). New motion must degrade to a crossfade or instant transition.
- **Color is never the only signal.** Order status uses color + label + icon. Channel chips use color + uppercase abbreviation. Cash/UPI panels use color + leading word, not just hue.
- **Language and locale.** India primary market — INR (₹), English UI, GST in CGST/SGST split. Phone fields default to `+91`. Customer flows must work on a wide range of devices (low-end Android on the QR side, iPads on the kiosk, mid-range Windows on desk).
- **DPDP (India 2023):** consent for optional phone fields is unchecked by default; purpose stated inline; opt-out instruction on every promo message; customer data deletion path in admin (P1).
