# DineFlow

Restaurant operations PWA for a thesis/demo build: QR/web ordering, kiosk ordering, kitchen display, desk POS, admin tools, Supabase data, Razorpay UPI flow, and local thermal-print support.

## Quick Start

```bash
npm install
cp .env.example .env.development
npm run check
npm run dev
```

The app runs on `http://localhost:3000` by default.

## Main Routes

- `/order` - public web/takeaway ordering
- `/menu/:tableId` - QR table ordering
- `/kiosk` - kiosk ordering
- `/status/:orderId` - customer order status
- `/kitchen` - kitchen display, role-protected
- `/desk` - staff desk/POS, role-protected
- `/admin` - admin tools and setup

## Project Shape

- `src/pages` - route-level screens grouped by surface
- `src/components` - shared product and UI components
- `src/hooks` - Supabase-backed data hooks
- `src/lib` - shared clients, contexts, and domain helpers
- `supabase/migrations` - database schema changes
- `supabase/functions` - Supabase Edge Functions
- `print-agent` - local companion process for printing

## Useful Commands

```bash
npm run check    # fast repository sanity check
npm run build    # production build, also validates imports
npm run preview  # serve the latest production build
```

## Notes

- `dist/`, `node_modules/`, and local `.env*` files are ignored and should be treated as generated/local state.
- `.env.example` documents the required Vite and Supabase variables.
- This folder currently has no `.git` directory. Restore or initialize git before making larger refactors so changes can be reviewed safely.
