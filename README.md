# SmartCOI

AI-powered Certificate of Insurance (COI) compliance tracking for commercial property managers.

SmartCOI is a B2B SaaS platform built for mid-market commercial real estate property management firms. It automates the entire COI workflow — from document upload and AI-powered data extraction to compliance verification, expiration tracking, and automated vendor follow-ups. Property managers get portfolio-wide visibility into insurance compliance without spreadsheets or manual review.

**Core value proposition:** Upload a COI PDF, get instant AI-powered compliance results, and let the system handle follow-ups — across every vendor and tenant in your portfolio.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 15 (App Router), React 19, TypeScript 5.7 |
| **Styling** | Tailwind CSS 3, shadcn/ui (Radix UI primitives), Lucide icons |
| **Database** | Supabase (PostgreSQL with Row Level Security) |
| **Auth** | Supabase Auth (email/password, JWT-based sessions) |
| **Storage** | Supabase Storage (`coi-documents` bucket) |
| **AI** | Anthropic Claude API (`claude-sonnet-4-20250514`) via Supabase Edge Functions |
| **Email** | Resend for transactional notifications |
| **Hosting** | Vercel with Vercel Cron for scheduled jobs |
| **Toast/UX** | Sonner for toast notifications |
| **Brand color** | `#73E2A7` (emerald) |

---

## Architecture Overview

### Key Patterns

- **Server Components** for all data fetching — pages query Supabase directly with the user's session, no client-side data fetching for lists/tables
- **Server Actions** (`'use server'`) for all mutations — create, update, delete operations with `revalidatePath` for ISR
- **Row Level Security (RLS)** on every table, scoped by `organization_id` — enforces multi-tenant data isolation at the database level
- **Service Role Client** for unauthenticated operations (portal uploads) — bypasses RLS with `SUPABASE_SERVICE_ROLE_KEY`
- **Daily Cron** (`/api/cron/daily-check` at 8:00 AM UTC) — checks expirations, schedules notifications, processes email queue

### Two User-Facing Surfaces

1. **Authenticated Dashboard** (`/dashboard/*`) — the full app for property managers behind Supabase Auth
2. **Public Self-Service Portal** (`/portal/[token]`) — a standalone upload page for vendors/tenants accessed via token-based links, no account required

---

## Database Schema

The canonical schema is in `supabase/migrations/20260217_fresh_setup.sql`. All 17 tables have RLS enabled, scoped by `organization_id`.

| Table | Purpose |
|-------|---------|
| `organizations` | Multi-tenant organization records with JSONB settings |
| `users` | User profiles linked to Supabase Auth, with org membership and role |
| `properties` | Real estate properties/buildings (office, retail, industrial, etc.) |
| `property_entities` | Certificate holders and additional insured entities per property |
| `organization_default_entities` | Default entities applied org-wide to new properties |
| `requirement_templates` | Reusable insurance requirement templates (system defaults + custom) |
| `template_coverage_requirements` | Coverage types, minimum limits, and flags per template |
| `vendors` | Contractors/service providers assigned to properties with compliance status |
| `tenants` | Building tenants with unit/suite info and compliance status |
| `certificates` | Uploaded COI documents with file path, hash, processing status, and upload source |
| `extracted_coverages` | AI-extracted coverage data (type, carrier, limits, dates, additional insured) |
| `extracted_entities` | AI-extracted certificate holder and additional insured names |
| `compliance_results` | Per-requirement compliance check outcomes (met/not_met/missing) with gap descriptions |
| `entity_compliance_results` | Certificate holder and additional insured match results |
| `notifications` | Scheduled and sent email notifications with status tracking |
| `upload_portal_tokens` | Token-based public upload links with expiry and active status |
| `activity_log` | Comprehensive audit trail for all business operations |

**System-default templates:** 6 templates are seeded during onboarding setup — Standard Vendor, High Risk Vendor, Professional Services, Standard Tenant, Restaurant Tenant, and Industrial Tenant — each with pre-configured coverage requirements.

---

## Key Features & Routes

### Public Pages

| Route | Description |
|-------|-------------|
| `/` | Marketing landing page with features, how-it-works, pricing, and CTAs |
| `/login` | Email/password authentication |
| `/signup` | New account creation |
| `/features/coi-tracking` | SEO content page — COI tracking for CRE |
| `/features/compliance-automation` | SEO content page — automated compliance verification |
| `/features/vendor-management` | SEO content page — vendor COI management |
| `/portal/[token]` | Self-service upload portal (public, token-based auth) |

### Authenticated App

| Route | Description |
|-------|-------------|
| `/setup` | Onboarding wizard (4 steps: org setup, first property, template selection, first COI upload) |
| `/dashboard` | Portfolio compliance overview — stats cards, priority action queue, activity feed |
| `/dashboard/properties` | Property list with compliance summary badges and search |
| `/dashboard/properties/[id]` | Property detail — vendor/tenant tables with status filters, entity requirements |
| `/dashboard/vendors/[id]` | Vendor detail — compliance breakdown, COI history, notification history, actions |
| `/dashboard/tenants/[id]` | Tenant detail — same layout as vendor detail |
| `/dashboard/certificates/upload` | COI upload page — drag-and-drop PDF with AI extraction |
| `/dashboard/certificates/[id]/review` | Review extracted data, edit coverages/entities, confirm, calculate compliance |
| `/dashboard/templates` | Requirement template list — system defaults and custom templates |
| `/dashboard/templates/[id]` | Template editor — coverage requirements with cascade recalculation |
| `/dashboard/notifications` | Notification center — tabs for all, scheduled, sent, and failed notifications |

### API Routes

| Route | Description |
|-------|-------------|
| `/api/auth/callback` | Supabase Auth callback handler |
| `/api/certificates/extract` | Authenticated COI extraction endpoint |
| `/api/portal/[token]/upload` | Public portal file upload (token-validated) |
| `/api/portal/[token]/extract` | Public portal extraction trigger (token-validated) |
| `/api/cron/daily-check` | Daily cron for notification scheduling and sending |

---

## Core Business Logic

### AI Extraction

COI PDFs are sent as base64 to the `extract-coi` Supabase Edge Function, which calls the Anthropic Claude API. Claude extracts structured JSON with coverage types, carriers, policy numbers, limits, effective/expiration dates, additional insured names, and certificate holder information. Results are stored in `extracted_coverages` and `extracted_entities`.

### Compliance Engine

Located in `src/lib/compliance/calculate.ts`. Compares extracted coverage data against template requirements:
- Checks coverage limits meet minimum thresholds (per occurrence, aggregate, statutory, etc.)
- Verifies additional insured entities are listed (fuzzy name matching with normalization)
- Validates certificate holder matches
- Checks for waiver of subrogation
- Flags expiring policies (configurable threshold, default 30 days)
- Derives overall status: `compliant`, `non_compliant`, `expiring_soon`, `expired`, `pending`, or `under_review`

### Notification Scheduler

Daily cron (`/api/cron/daily-check`) runs two phases:
1. **Schedule** — checks all vendors/tenants for expiring coverages at 60, 30, 14, 0, and -7 day thresholds; schedules gap follow-ups every 14 days for non-compliant entities
2. **Send** — processes pending scheduled notifications via Resend with HTML email templates

Manual follow-ups can also be sent from vendor/tenant detail pages with one click.

### Portal System

Token-based public upload for vendors/tenants:
- Tokens generated with 90-day expiry, one active token per entity
- Portal page shows insurance requirements and previous compliance gaps
- Rate-limited to 5 uploads per token per hour
- File validation: PDF only, 10 MB max, magic byte check, SHA-256 dedup
- Triggers AI extraction and PM notification on upload
- Sets entity status to `under_review`

### Template Cascade

When a requirement template is updated, the system automatically recalculates compliance for every vendor and tenant assigned to that template. New compliance results replace old ones, and entity statuses are updated accordingly. Activity log records each recalculation.

---

## Environment Variables

Create `.env.local` from `.env.example`:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (Settings > API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key (Settings > API) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role secret (Settings > API) — server-side only |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude (console.anthropic.com) |
| `RESEND_API_KEY` | Resend API key for email (resend.com) |
| `NEXT_PUBLIC_APP_URL` | Production URL (e.g., `https://smartcoi.io`) |
| `CRON_SECRET` | Shared secret for authenticating cron requests |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project with Edge Functions deployed
- Anthropic API key
- Resend API key (for email functionality)

### Setup

```bash
# Clone the repository
git clone <repo-url>
cd Smart-COI

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Fill in all values in .env.local

# Run the fresh setup migration against your Supabase project
# Execute supabase/migrations/20260217_fresh_setup.sql in the Supabase SQL editor

# Start development server
npm run dev
```

Opens at [http://localhost:3000](http://localhost:3000).

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | TypeScript check + production build |
| `npm run start` | Serve production build |
| `npm run lint` | Run ESLint |

---

## Deployment

Deployed on **Vercel** with the following configuration:

1. **Environment variables** — set all variables from the table above in Vercel project settings
2. **Supabase Storage** — create a `coi-documents` bucket with public access for certificate PDFs
3. **Vercel Cron** — configured in `vercel.json` to run `/api/cron/daily-check` daily at 8:00 AM UTC
4. **Resend** — domain verification required for production email delivery (SPF/DKIM records)
5. **Supabase Edge Functions** — deploy the `extract-coi` function with `ANTHROPIC_API_KEY` set as a secret

---

## File Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Login & signup pages (branded layout)
│   ├── (dashboard)/              # Authenticated dashboard pages
│   │   └── dashboard/
│   │       ├── certificates/     # Upload and review pages
│   │       ├── notifications/    # Notification center
│   │       ├── properties/       # Property list and detail
│   │       ├── templates/        # Template list and editor
│   │       ├── vendors/          # Vendor detail pages
│   │       └── tenants/          # Tenant detail pages
│   ├── (onboarding)/             # Setup wizard
│   ├── api/                      # API routes (auth, cron, portal, certificates)
│   ├── features/                 # SEO content pages
│   ├── portal/                   # Public self-service upload portal
│   ├── error.tsx                 # Global error boundary
│   ├── not-found.tsx             # Custom 404 page
│   ├── sitemap.ts                # Dynamic sitemap.xml
│   ├── robots.ts                 # robots.txt configuration
│   ├── layout.tsx                # Root layout (fonts, Toaster)
│   └── page.tsx                  # Landing page
├── components/
│   ├── compliance/               # Certificate review, compliance breakdown, COI history
│   ├── dashboard/                # Sidebar shell, navigation
│   ├── landing/                  # Navbar, footer, hero, animations
│   ├── notifications/            # Notification list and management
│   ├── onboarding/               # Multi-step onboarding flow
│   ├── properties/               # Property forms, vendor/tenant dialogs, confirm dialog
│   ├── templates/                # Template editor, labels, list
│   └── ui/                       # shadcn/ui primitives (button, card, dialog, etc.)
├── hooks/                        # React hooks (useUser)
├── lib/
│   ├── actions/                  # Server actions (properties, templates, certificates, notifications)
│   ├── compliance/               # Compliance calculation engine
│   ├── notifications/            # Email sender, templates, scheduler
│   ├── supabase/                 # Supabase clients (browser, server, service role)
│   └── utils.ts                  # Formatting helpers (currency, dates, cn)
├── services/                     # AI extraction service
├── types/                        # TypeScript type definitions (all enums and table interfaces)
└── middleware.ts                  # Auth middleware (public route allowlist)

supabase/
├── functions/                    # Edge Functions (extract-coi, notifications, billing)
└── migrations/                   # SQL migrations (20260217_fresh_setup.sql is canonical)
```

---

## Future Roadmap

These features are planned but not implemented in v1:

- **PMS Integrations** — Yardi, MRI, Angus, AppFolio data sync
- **Multi-user roles** — asset manager read-only view, team invites and permissions
- **Lease extraction** — automated tenant insurance requirement extraction from lease documents
- **Reporting** — compliance reports with CSV/PDF export, scheduled report delivery
- **Billing** — Stripe subscription management (infrastructure exists in Edge Functions)
- **Error monitoring** — Sentry integration for production error tracking
- **Advanced analytics** — compliance trending, portfolio risk scoring, vendor benchmarking

---

## License

Proprietary — All rights reserved.
