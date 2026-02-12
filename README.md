# SmartCOI

AI-powered Certificate of Insurance tracking for property managers.

## What it does

Upload a COI PDF and SmartCOI extracts coverage data with AI, checks it against your requirements, and tracks expirations — for both vendors and tenants.

**Core features:**

- AI COI extraction (via Supabase Edge Functions + Claude)
- Per-property requirement templates with preset starting points
- Instant compliance checking against requirements
- Vendor and tenant management with multi-property support
- Expiration alerts and automated follow-up emails
- Lease document extraction for tenant requirements
- PDF compliance report export
- Vendor self-service COI upload portal
- Dashboard with compliance analytics

## Tech stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, React Query
- **Backend:** Supabase (PostgreSQL, Auth, Edge Functions, Storage)
- **AI:** Anthropic Claude (COI + lease extraction via Edge Functions)
- **Deployment:** Vercel

## Local development

### Prerequisites

- Node.js 18+
- A Supabase project with Edge Functions deployed

### Setup

```bash
npm install
```

Create `.env.local` with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Run the database migrations in `supabase/migrations/` against your Supabase project (in order).

### Run

```bash
npm run dev
```

Opens at [http://localhost:5173](http://localhost:5173).

### Other scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

## Project structure

```
src/
  pages/           # Route-level page components
  components/
    ui/            # shadcn/ui primitives
    shared/        # Reusable app components
    layout/        # Shell, sidebar, header
    vendors/       # Vendor-specific components
    tenants/       # Tenant-specific components
    landing/       # Marketing landing page sections
  services/        # Supabase queries and business logic
  hooks/           # React hooks (auth, media queries, etc.)
  lib/             # Supabase client, utilities
  types/           # TypeScript type definitions
  constants/       # App-wide constants

supabase/
  functions/       # Edge Functions (AI extraction, notifications, billing)
  migrations/      # SQL migrations

supabase-migrations/  # Legacy migration files
```

## Database migrations

Migrations live in `supabase/migrations/` and are prefixed with dates. Run them in order against your Supabase SQL editor. Key tables:

- `vendors` / `tenants` — entities being tracked
- `properties` — buildings / properties
- `requirement_templates` — reusable coverage requirement sets per property
- `requirement_profiles` — per-entity requirement assignments
- `building_defaults` — default requirements per property
- `activity_log` — unified audit trail

## Edge Functions

Deployed to Supabase Edge Functions:

| Function | Purpose |
|----------|---------|
| `extract-coi` | AI extraction of COI PDF data |
| `extract-lease` | AI extraction of lease documents |
| `extract-lease-requirements` | Extract insurance requirements from leases |
| `extract-requirements` | Extract requirements from uploaded docs |
| `recheck-compliance` | Re-validate vendor compliance |
| `send-notifications` | Expiration alert emails |
| `send-coi-request` | Request updated COI from vendor |
| `auto-follow-up` | Automated follow-up reminders |
| `send-contact` | Contact form handler |
| `create-checkout-session` | Stripe checkout |
| `create-portal-session` | Stripe billing portal |
| `stripe-webhook` | Stripe event handler |

## License

Proprietary — All rights reserved.
