---
name: DineFlow
description: Restaurant operations PWA — multi-channel ordering, kitchen display, desk POS.
colors:
  service-orange: "#EA580C"
  service-orange-soft: "#FFF4ED"
  service-orange-mid: "#FB923C"
  service-orange-deep: "#C2410C"
  service-orange-bark: "#9A3412"
  slate-ink: "#1C1917"
  deep-char: "#292524"
  stone-quiet: "#57534E"
  stone-mid: "#78716C"
  stone-soft: "#A8A29E"
  paper-white: "#FFFFFF"
  service-paper: "#FAFAF9"
  soft-paper: "#F5F5F4"
  faded-paper: "#EFEDE9"
  hairline-stone: "#E7E5E4"
  kitchen-slate: "#0F172A"
  kitchen-steel: "#1E293B"
  kitchen-rule: "#334155"
  kitchen-light: "#F1F5F9"
  kitchen-dim: "#94A3B8"
  status-pending: "#3B82F6"
  status-accepted: "#8B5CF6"
  status-preparing: "#F59E0B"
  status-ready: "#22C55E"
  status-completed: "#737373"
  status-cancelled: "#EF4444"
  channel-qr: "#10B981"
  channel-kiosk: "#0EA5E9"
  channel-web: "#8B5CF6"
  channel-desk: "#F59E0B"
typography:
  display:
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif'
    fontSize: "2.25rem"
    fontWeight: 800
    lineHeight: "2.5rem"
    letterSpacing: "-0.02em"
  headline:
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif'
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: "2rem"
    letterSpacing: "-0.018em"
  title:
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif'
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: "1.75rem"
    letterSpacing: "normal"
  body:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: "1.5rem"
    letterSpacing: "normal"
  label:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: "1.25rem"
    letterSpacing: "normal"
  mono:
    fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace'
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: "1.5rem"
    letterSpacing: "-0.02em"
    fontFeature: '"tnum" 1, "lnum" 1'
  eyebrow-chip:
    fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace'
    fontSize: "10px"
    fontWeight: 700
    lineHeight: "1rem"
    letterSpacing: "0.16em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
spacing:
  hairline: "1px"
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  tap: "48px"
  tap-xl: "64px"
components:
  button-primary:
    backgroundColor: "{colors.service-orange}"
    textColor: "{colors.paper-white}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.service-orange-deep}"
  button-primary-active:
    backgroundColor: "{colors.service-orange-bark}"
  button-hero:
    backgroundColor: "{colors.service-orange}"
    textColor: "{colors.paper-white}"
    typography: "{typography.title}"
    rounded: "{rounded.lg}"
    padding: "0 32px"
    height: "64px"
  button-subtle:
    backgroundColor: "transparent"
    textColor: "{colors.deep-char}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "44px"
  button-subtle-hover:
    backgroundColor: "{colors.soft-paper}"
  button-inverse:
    backgroundColor: "{colors.kitchen-steel}"
    textColor: "{colors.kitchen-light}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "44px"
  button-danger:
    backgroundColor: "{colors.status-cancelled}"
    textColor: "{colors.paper-white}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "44px"
  input-field:
    backgroundColor: "{colors.soft-paper}"
    textColor: "{colors.slate-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "44px"
  input-field-focus:
    backgroundColor: "{colors.paper-white}"
  channel-chip-qr:
    backgroundColor: "rgba(16, 185, 129, 0.10)"
    textColor: "#047857"
    typography: "{typography.eyebrow-chip}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  channel-chip-kiosk:
    backgroundColor: "rgba(14, 165, 233, 0.10)"
    textColor: "#0369A1"
    typography: "{typography.eyebrow-chip}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  channel-chip-web:
    backgroundColor: "rgba(139, 92, 246, 0.10)"
    textColor: "#6D28D9"
    typography: "{typography.eyebrow-chip}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  channel-chip-desk:
    backgroundColor: "rgba(245, 158, 11, 0.10)"
    textColor: "#B45309"
    typography: "{typography.eyebrow-chip}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
---

# Design System: DineFlow

## 1. Overview

**Creative North Star: "The Service Pad"**

DineFlow looks and feels like the artifacts of a working restaurant: a KOT docket torn from the dispenser, a clipboard-backed operator strip at the desk, a service captain's mono pen-stroke on a thermal receipt, colored rail tags on the kitchen board. The visual vocabulary is borrowed from the floor — perforated tickets, dotted-leader ledger lines, channel chips, an amount slab where money is "waiting" — never from generic SaaS dashboards.

The system runs in three zones, and the zone changes the air more than the chrome. **Customer surfaces** (menu, kiosk, web order, status) are warm and appetizing — Service Paper canvas, Service Orange CTAs, food photography front-and-center. **Kitchen surfaces** (KDS) are deep slate at night-shift contrast — Kitchen Slate background, Kitchen Light text, color carries order state and nothing else. **Staff surfaces** (desk, admin) are dense and controlled — cross-hatched canvas like a docket pad, mono numerics carry money and time, a deep Slate Ink operator strip lives at the bottom of the desk view.

This is not a Toast/Square/Posist clone, not a Stripe-admin starter kit, not a "cream + one accent" editorial restaurant. We have a real material language — dockets, ledger rows, channel chips, the operator strip — and new surfaces extend it instead of reaching for generic cards. Personality: **capable, tactile, operational**.

**Key Characteristics:**
- Three-zone palette: warm-paper customer, dark-slate kitchen, cross-hatched staff
- Service Orange (`#EA580C`) is the only saturated brand color; everything else is neutral or semantic
- JetBrains Mono with tabular-nums for every currency, total, and dwell-time readout
- Signature artifacts: perforated KOT docket, deep-ink operator strip, color-coded channel chips, amount slab
- Minimum 48 px tap targets across customer + staff; 64 px on kiosk
- WCAG 2.1 AA across all surfaces, reduced motion respected globally

## 2. Colors

The palette is built around one saturated brand color, one warm-neutral text/surface family, one dark-slate kitchen family, and one set of semantic state colors. No decorative accents.

### Primary
- **Service Orange** (`#EA580C`): The single brand-saturated color. Used for primary CTAs, current selection, focus rings, kiosk hero gradient (`bg-brand-hot`: `linear-gradient(135deg, #FB923C → #EA580C → #C2410C)`), the `tap-pulse` halo, and a subtle wash on customer-surface heat backgrounds. Appetite cue on customer surfaces; accent-only on staff and KDS.
- **Service Orange Soft** (`#FFF4ED`): tinted wash used inside `heat-surface` radial gradients and as a soft-fill backdrop on customer chips.
- **Service Orange Mid / Deep / Bark** (`#FB923C` / `#C2410C` / `#9A3412`): gradient stops for `bg-brand-hot` and the hover/active states of `button-primary`.

### Secondary (omitted)
No secondary brand color. The system is single-accent by design; semantic state colors do the rest.

### Tertiary (semantic state)
- **Pending Blue** (`#3B82F6`): order in `pending` state; awaiting kitchen pickup.
- **Accepted Violet** (`#8B5CF6`): kitchen has accepted; KOT printed.
- **Preparing Amber** (`#F59E0B`): order being made. Also the *money-waiting* hue on `amount-slab-hot` (pending cash glow) and the `desk` channel chip.
- **Ready Green** (`#22C55E`): order ready for handoff or table delivery.
- **Cancelled Red** (`#EF4444`): cancelled or void; also the `danger` button variant.
- **Completed Neutral** (`#737373`) / **Expired Stone** (`#A8A29E`): terminal states, deliberately low-saturation to drop out of attention.

### Channel rail tags
- **QR Emerald** (`#10B981`), **Kiosk Sky** (`#0EA5E9`), **Web Violet** (`#8B5CF6`), **Desk Amber** (`#F59E0B`). Used only inside `.channel-chip` (10% tint + inset ring) on KDS, desk, and admin order views. Channel is always color + uppercase mono abbreviation, never color alone.

### Neutral — Customer + Staff (warm)
- **Slate Ink** (`#1C1917`): body text on customer + staff surfaces; the deep-ink operator strip background.
- **Deep Char** (`#292524`): secondary text, button-subtle copy.
- **Stone Quiet** (`#57534E`) / **Stone Mid** (`#78716C`) / **Stone Soft** (`#A8A29E`): label, placeholder, disabled.
- **Paper White** (`#FFFFFF`): docket surface, focused input fill.
- **Service Paper** (`#FAFAF9`): body background on customer + staff zones.
- **Soft Paper** (`#F5F5F4`) / **Faded Paper** (`#EFEDE9`): input default fill, hover surfaces.
- **Hairline Stone** (`#E7E5E4`): every divider, every outline-button ring, every dashed `.hairline`.

### Neutral — Kitchen (dark)
- **Kitchen Slate** (`#0F172A`): KDS body background.
- **Kitchen Steel** (`#1E293B`): KDS card surface, `button-inverse` fill.
- **Kitchen Rule** (`#334155`): KDS dividers and inset rings.
- **Kitchen Light** (`#F1F5F9`): KDS text.
- **Kitchen Dim** (`#94A3B8`): KDS secondary text (timestamps, dwell counters).

### Named Rules

**The One-Voice Rule.** Service Orange is the only saturated brand color. It carries primary CTAs, current selection, focus rings, and one hero gradient. Status hues do not appear as decoration — they appear only when an order is in that state. Channel hues do not appear as accents — they appear only inside a `.channel-chip`. If you find Service Orange or any semantic hue used as a background tint for ambiance, it's wrong.

**The Money-Hue Rule.** `Preparing Amber` (`#F59E0B`) is the hue for "something is waiting" — preparing-state orders, pending cash, the operator-strip alert. Never use blue or green for money. Never tint the body in amber; the slab is the artifact.

**The Channel Always-Two-Signals Rule.** Channel is *color + uppercase mono abbreviation* (`QR` / `KIOSK` / `WEB` / `DESK`). Never color alone, never the word alone. Color-blindness compatibility and glanceability both demand both.

## 3. Typography

**Display Font:** Plus Jakarta Sans (with `system-ui, sans-serif` fallback). Weights 600 / 700 / 800.
**Body Font:** Inter (with `system-ui, sans-serif` fallback). Weights 400 / 500 / 600.
**Mono Font:** JetBrains Mono (with `ui-monospace, SFMono-Regular, Menlo, monospace` fallback). Weights 400 / 500 / 600 / 700.

**Character:** Plus Jakarta Sans is geometric-warm — softer than Inter, with rounded terminals that read as friendly without losing authority on headings. Inter is the workhorse body; tuned for screens, consistent across zones. JetBrains Mono is the operator voice — tabular-nums on, `tnum`/`lnum` features enabled, lightly negative letter-spacing on big readouts so totals read tight. The pairing is **geometric display + neutral body + slab-ish mono** — three families on different axes, not three of the same kind.

### Hierarchy
- **Display** (Plus Jakarta Sans 800, 36 px, line-height 40 px, tracking −0.02 em): hero headlines on kiosk and customer landing; large page titles on admin.
- **Headline** (Plus Jakarta Sans 700, 24 px, line-height 32 px, tracking −0.018 em): section headings on customer and admin; KDS column headings.
- **Title** (Plus Jakarta Sans 600, 20 px, line-height 28 px): card titles, menu item names, modal titles.
- **Body** (Inter 400, 16 px, line-height 24 px): descriptions, customer copy, prose. Cap at 65–75 ch.
- **Label** (Inter 500, 14 px, line-height 20 px): form labels, button copy, table headers.
- **Mono Readout** (JetBrains Mono 500, 16 px+, tracking −0.02 em, `tnum` 1, `lnum` 1): currency, totals, table dwell time. Scales up to display sizes on cash modal and drawer header (`.readout`).
- **Eyebrow / Label** (JetBrains Mono 700, 9-11 px, tracking 0.16-0.22 em, uppercase): the label-over-value vocabulary. Used inside `.channel-chip`, above data slabs in the operator strip and pending-stat tiles, and as a single page-level kicker above each surface's h2. Not a per-section scaffold.

### Named Rules

**The Money-Is-Mono Rule.** Every currency value, line total, GST split, cash amount, and dwell time uses JetBrains Mono with `font-variant-numeric: tabular-nums`. Composing a price in Inter or Plus Jakarta is wrong. Use the `.num`, `.amount-slab`, or `.readout` utility classes from `index.css`; do not re-roll.

**The Eyebrow-Is-A-Label Rule.** Uppercase mono tracked type (10-11 px, weight 700, tracking 0.16-0.22 em) is the system's *label-over-value* vocabulary, not section-eyebrow vocabulary. It appears in exactly three places:
1. The `.channel-chip` — `QR` / `KIOSK` / `WEB` / `DESK`.
2. The small label sitting above a value on the operator strip, pending-stat slab, info block, summary row, ledger header (`ConsoleStat`, `PendingStat`, `Info`, `Readout`, `Operator`, `Now viewing`). The label is functional — it names the number underneath.
3. The brand-700 eyebrow above page-level h2 on staff surfaces (e.g. `Cash settlement` above "Pending cash rail", `Activity` above "All orders") — *one per page, scoped to the page heading only*. Page-level only; sub-section h3/h4 do not get one.

There is no `ABOUT` / `PROCESS` / `PRICING` eyebrow vocabulary above every section — that is the SaaS-grammar trap. The page-level brand-700 eyebrow is the only h2 eyebrow; everything below uses the title/headline scale plainly.

**The Display-Stays-In-Its-Zone Rule.** Plus Jakarta Sans renders headings, page titles, and the kiosk hero. It never renders form labels, button copy, table column headers, or data values. Buttons and labels are Inter; data is mono.

## 4. Elevation

Layered, not stacked. Most surfaces are flat at rest; depth is conveyed through warm-paper layering (Paper White docket on Service Paper canvas), inset rings on dark-mode cards (`ring-1 ring-inset ring-kitchen-rule`), and dotted/dashed hairlines on staff surfaces. Hover and focus *earn* a shadow; resting surfaces don't broadcast one.

### Shadow Vocabulary
- **Shadow sm** (`0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 1px 0 rgb(0 0 0 / 0.03)`): default for `.kbd`, dense list items at rest. Barely visible; reads as a single weight.
- **Shadow md** (`0 4px 12px -2px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.04)`): default for the `.docket` artifact at rest, plus floating panels (toast, popover).
- **Shadow lg** (`0 12px 32px -8px rgb(0 0 0 / 0.18), 0 4px 12px -4px rgb(0 0 0 / 0.08)`): modals, drawers, sheet-up panels.
- **Shadow brand** (`0 12px 28px -8px rgb(234 88 12 / 0.45)`): primary and hero buttons at rest. The brand glow says "tap me first" without color saturation.
- **Shadow glow** (`0 0 0 4px rgb(234 88 12 / 0.18)`): input focus halo. Pairs with `ring-brand-500`.
- **Shadow ring** (`inset 0 0 0 1px rgb(231 229 228 / 1)`): an inset hairline. Used in dense desk panels where a border-radius and a true 1 px ring need to share the same edge.

### Named Rules

**The Docket-Shadow Rule.** The KOT docket carries a soft `shadow-md` plus a perforated sawtooth bottom edge (`::after` radial gradient). Nothing else carries both. The docket is the signature object; it stays unique.

**The Inset-Over-Outset Rule.** On KDS and dense desk panels, prefer `ring-1 ring-inset` over `border` and over outer shadow. Outset shadow on a dark slate background looks dirty; inset ring reads as a clean edge under fluorescent kitchen light.

## 5. Components

### Buttons
- **Shape:** rounded corners. `sm` (36 px) / `md` (44 px) and 8 px radius for default desk + customer; `lg` (56 px) at 12 px radius; `xl` (64 px) at 16 px radius for kiosk. Minimum 44 px height (WCAG 2.5.5).
- **Primary** (`bg-brand-500 text-white shadow-brand`): the default everywhere outside KDS. Service Orange fill, white label, brand glow. `hover:bg-brand-600 active:bg-brand-700`. `disabled:bg-ink-400 disabled:shadow-none`.
- **Hero** (`bg-brand-hot`): the orange→deep-orange gradient used on kiosk and customer hero CTAs. Adds `ring-1 ring-brand-700/30` for definition. The only place a gradient is legitimate in this system; it's a reinforced primary, not decoration.
- **Subtle** (transparent → soft-paper hover): for dense desk and admin action columns. No fill at rest; hover tints toward `Soft Paper`.
- **Outline** (transparent + 1 px hairline-stone ring inset): secondary actions where presence matters but the action is not the primary.
- **Inverse** (`bg-kds-card text-kds-text ring-1 ring-inset ring-kds-line`): the only button variant on KDS. Slate fill, kitchen-light label, kitchen-rule inset ring. Hover lifts to `kds-line`.
- **Danger** (`bg-status-cancelled`): voids, refunds, irreversible destructive actions. Used sparingly; confirmation always precedes it.
- **Press feedback:** `active:scale-[0.98]` on all variants. Reduced motion respected by the global rule in `index.css`.

### Inputs / Fields
- **Style:** Default fill is `Soft Paper` (`#F5F5F4`) with a transparent inset ring; text is `Slate Ink`. Placeholder is `Stone Soft` — verify ≥4.5:1 against the chosen background (it passes on Soft Paper; it does NOT pass on tinted backgrounds).
- **Focus:** ring shifts to `ring-brand-500`, fill brightens to `Paper White`, and `shadow-glow` (4 px Service-Orange wash) appears around the field. No layout shift; it's a state, not a resize.
- **Error:** inset ring becomes `ring-status-cancelled/40`, fill becomes `bg-status-cancelled/5`, error label below the field in `text-status-cancelled`. Error is always text + color + icon, never color alone.
- **Sizes:** `sm` (36 px), `md` (44 px default), `lg` (56 px), `kiosk` (64 px). Kiosk inputs use the `xl` radius (16 px) and large icons.

### Channel Chip (signature)
- **Style:** 10 % background tint of the channel color + 20 % inset ring + matching dark-text foreground. Mono 700-weight, 10 px, uppercase, 0.16 em tracking.
- **Vocabulary:** `QR` emerald / `KIOSK` sky / `WEB` violet / `DESK` amber. Four channels, four hues, locked.
- **Where:** every order card on KDS, desk, and admin order views. Pinned top-left of the card; never inline with body copy.

### KOT Docket (signature)
- **Style:** Paper-white surface, soft `shadow-md`, sawtooth perforation at the bottom edge (`::after` with radial-gradient circles), optional perforated header strip (`docket-perf-top`) for "torn from dispenser" feel.
- **Where:** order summaries in the desk pending panel, KOT preview in admin, printed-receipt preview before send. The docket is the *primary unit* of order representation on staff surfaces — not a generic card.
- **Contents:** order number in mono headline at the top; channel chip top-right; line items in `.ledger-row` (dotted leader, mono price right); total in `.amount-slab` at the bottom.

### Operator Strip (signature)
- **Style:** `.console-strip`. Linear gradient `#1C1917 → #15110F` with a subtle inset white line at the bottom. Holds `.strip-nav` pills (semibold 13 px, with a 2 px Service-Orange underline on `aria-current="page"`).
- **Where:** the persistent **top** strip on the desk console (64 px tall). Carries operator identity, live time, service mode, drawer total, pending-cash count, live heartbeat. The tab rail sits directly below the strip; primary navigation lives in the rail, not in the strip itself.

### Amount Slab (signature)
- **Style:** Mono, tabular-nums, −0.02 em tracking. `.amount-slab-hot` variant gets a `radial-gradient` Amber wash at the top + a 1 px Amber inset ring — used only for "money is waiting" surfaces (pending cash row, undelivered UPI).
- **Where:** desk pending-cash list, large total readouts on the cash modal, drawer header.

### Live Dot / Heartbeat (signature)
- **`.live-dot`**: small (2 px halo) pulsing dot, infinite `tap-pulse` animation, sits next to "Connected" / "Realtime" labels.
- **`.heartbeat`**: bigger (3 px halo) pulsing dot, used in the operator strip status block to signal "you are live with the kitchen."
- Both respect reduced motion (global `index.css` rule).

### Cards / Containers
- **Style:** Paper White or Service Paper fill, 8–16 px radius depending on context (8 px for dense desk lists, 12 px for customer items, 16 px for kiosk hero blocks). Inset `Hairline Stone` ring at rest; outer shadow only on hover/focus.
- **Internal padding:** 16 px for dense desk; 20 px for customer; 24 px+ for kiosk.
- **No nested cards.** Use background tone-shift (Paper White on Service Paper, or Soft Paper on Paper White) to indicate grouping inside a surface.

### Navigation
- **Customer (menu, kiosk, web):** sticky top header with category chips. `font-display` for the brand mark, `Inter 500` for category chips. Active category gets a 2 px Service-Orange underline.
- **Staff (desk):** persistent `.console-strip` at the bottom. `.strip-nav` pills with semibold 13 px Inter, 11 px height, brand-underline on `aria-current="page"`.
- **Admin:** left sidebar with section groups; `Inter 500` 14 px section headings, `Inter 400` 14 px items. Active item: `bg-surface-100`, no decorative border.
- **Kitchen:** no navigation chrome. Full-bleed board.

## 6. Do's and Don'ts

### Do:
- **Do** route every currency, total, GST split, and time-on-table through `JetBrains Mono` with tabular-nums. Use the `.num`, `.amount-slab`, or `.readout` classes from `index.css`.
- **Do** carry status through `status.*` palette tokens and a label. Color is the second signal, not the only one.
- **Do** use the `.docket` artifact for order summaries on staff surfaces. It's the system's primary unit of order representation — not a generic card.
- **Do** mark every channel with both color AND uppercase mono abbreviation (`QR` / `KIOSK` / `WEB` / `DESK`) via `.channel-chip`.
- **Do** keep tap targets at 48 px minimum (44 px height + visual padding) on customer + staff; 64 px on kiosk.
- **Do** use `bg-brand-hot` *only* for kiosk and customer hero CTAs. Anywhere else, the flat Service Orange (`bg-brand-500`) is correct.
- **Do** verify body text hits ≥4.5:1 contrast against background. Stone Soft (`#A8A29E`) as body text on Service Paper is below the floor — bump to Stone Quiet (`#57534E`) or Deep Char (`#292524`).
- **Do** test heading copy at every breakpoint. The viewport is part of the design; long words plus large clamp scales overflow on narrow widths.

### Don't:
- **Don't** put Service Orange or any status hue on a body background or as ambient ambiance. The One-Voice Rule: brand color is for action, status is for state, and that is all.
- **Don't** introduce a second brand color, a tertiary accent, or a "secondary CTA" hue. Outline / Subtle / Ghost variants exist for exactly this.
- **Don't** use cream / sand / linen as a body background even though `service-paper` is warm. The warmth comes from the dockets, the orange, and the typography — not from a deeper tinted body. (Toast / Posist / generic "warm restaurant SaaS" templates.)
- **Don't** use `border-left` greater than 1 px as a colored stripe on cards, list items, callouts, alerts. We have channel chips, ledger rows, and the docket perforation — extend those, not Bootstrap-era side stripes.
- **Don't** use `background-clip: text` with a gradient. The only legitimate gradient is `bg-brand-hot` on the kiosk and customer hero CTAs, applied to a button fill.
- **Don't** reach for glassmorphism, gradient text, or stripe-borders for "polish." If a component needs more presence, give it more *spec presence*: bigger mono numerics, a perforated edge, a deeper inset ring.
- **Don't** scaffold sections with uppercase tracked eyebrows (`ABOUT` / `PROCESS` / `PRICING`) or with numbered markers (`01 · About / 02 · Process`). The only uppercase mono tracked type in this system is the `.channel-chip`. Not negotiable.
- **Don't** render the desk or kitchen in light-mode if the user is in a dimly-lit service area — KDS is *deliberately* dark slate. Don't "modernize" it to light.
- **Don't** use Plus Jakarta Sans for form labels, button copy, table column headers, or data values. Headings only. Buttons + labels are Inter; data is mono.
- **Don't** introduce nested cards. If grouping is needed inside a surface, shift the background tone (Paper White on Service Paper) — don't drop another bordered rectangle inside.
- **Don't** ship animations without a `prefers-reduced-motion` fallback. The global rule in `index.css` covers it for utility classes; bespoke motion (`framer-motion`) must respect it explicitly.
