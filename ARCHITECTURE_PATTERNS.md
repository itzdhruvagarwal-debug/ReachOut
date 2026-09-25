# Codebase Architecture & File/Folder Organization Standards

> **Canonical Reference for Antigravity & Engineering Team**  
> All future contributions, refactoring, and AI-assisted development across this repository (`vyaparmedia`) **MUST** strictly adhere to the patterns documented herein.

---

## 1. Directory Structure Taxonomy

The project follows a modular, feature-oriented structure designed for high scalability, clear separation of concerns, and clean discoverability.

```text
vyaparmedia/
├── prisma/                          # Database schema, migrations, and seed scripts
├── public/                          # Static assets (images, icons, manifest, sw.js)
├── scripts/                         # Operational & automated testing scripts
├── tests/                           # Vitest test suite (unit, integration, load)
│   ├── setup.ts
│   └── unit/
└── src/
    ├── app/                         # Next.js App Router (Pages, Layouts, API Route Handlers)
    │   ├── (auth)/                  # Auth route group
    │   ├── admin/                   # Admin portal views
    │   ├── api/                     # Backend REST & Webhook endpoints
    │   ├── dashboard/               # User dashboard views (deals, wallet, campaigns, etc.)
    │   ├── layout.tsx               # Root layout
    │   └── page.tsx                 # Landing page
    ├── components/                  # React UI components (Feature-scoped + UI Primitives)
    │   ├── admin/                   # Admin-specific UI panels & tables
    │   ├── analytics/               # Visual analytics dashboards & charts
    │   ├── dashboard/               # Dashboard feature folders (deals, wallet, messages, etc.)
    │   ├── discovery/               # Search & discovery cards
    │   ├── landing/                 # Landing page sections
    │   ├── navigation/              # Header, footer, app shell navigation
    │   ├── notifications/           # Notification cards & bell triggers
    │   ├── profile/                 # Influencer/Brand profile components
    │   ├── pwa/                     # PWA install prompts & offline banners
    │   ├── register/                # Onboarding & registration flows
    │   ├── security/                # Two-factor & security controls
    │   └── ui/                      # Base design system primitives (Button, Modal, Toast, etc.)
    ├── hooks/                       # Reusable React hooks
    │   ├── api/                     # API query/mutation hooks (useWallet, useCampaigns, etc.)
    │   └── use*.ts                  # Client UI hooks (useChartWidth, useTheme, etc.)
    ├── lib/                         # Core utilities, API clients, security, schemas, DB
    │   ├── api-client/              # Universal client-side typed API fetcher
    │   ├── schemas/                 # Zod validation schemas
    │   ├── auth.ts                  # NextAuth / session management
    │   ├── db.ts                    # Prisma client singleton
    │   ├── redis.ts                 # Upstash Redis & Enterprise caching
    │   ├── logger.ts                # Structured Winston server-side logger
    │   └── utils-client.ts          # Client-side formatting & helpers
    ├── services/                    # Domain Service Layer (Backend Business Logic)
    │   ├── application/             # Application sub-domain modules
    │   ├── campaign/                # Campaign sub-domain modules
    │   ├── deal/                    # Deal lifecycle sub-domain modules
    │   └── *.service.ts             # Domain service facades (DealService, WalletService, etc.)
    └── types/                       # Shared global TypeScript definitions
```

---

## 2. Component Organization & UI Architecture Pattern

### 2.1 Directory Taxonomy & Feature-Folder Scoping
The UI codebase strictly isolates components by scope, domain, and lifecycle:

```text
src/components/
├── ui/                     # Universal Base UI primitives (Button, Modal, Input, Toast, Select, etc.)
│   └── index.ts            # Single barrel export for all primitives (@/components/ui)
├── navigation/             # App shell navigation & responsive frames
│   ├── DesktopSidebar.tsx  # Desktop fixed navigation drawer with role-based links
│   ├── MobileBottomBar.tsx # Mobile fixed bottom navigation with 44pt tap targets & safe-area insets
│   ├── EscrowStoriesBar.tsx# Instagram-style horizontal story strip for deal updates & highlights
│   └── RoleGuard.tsx       # Route access guard by authenticated role
├── discovery/              # Creator & Campaign discovery feed architecture
│   ├── DiscoveryFeed.tsx   # High-concurrency searchable & filterable feed
│   ├── CampaignDiscoveryCard.tsx # Campaign presentation card with quick-apply
│   ├── CreatorDiscoveryCard.tsx  # Influencer showcase card with DRS badge & metrics
│   ├── FilterBottomSheet.tsx     # Mobile-optimized slide-up filter sheet
│   └── PullToRefresh.tsx         # Mobile touch pull-to-refresh handler
├── profile/                # Creator portfolio & brand profile components
│   ├── InfluencerProfileClient.tsx # Interactive profile with rate cards & direct offer CTA
│   └── CampaignProofModal.tsx      # Modal displaying verified past deliverables
├── help/                   # Knowledge base & FAQ help center
│   └── HelpCenterClient.tsx# Interactive categorized FAQ search & ticket escalation
├── register/               # Multi-step onboarding & registration components
│   ├── OtpFields.tsx       # 6-digit individual numeric input with auto-advance & paste
│   ├── Step2RegistrationForm.tsx # Role selection & password confirmation
│   └── useRegistration.ts  # Client state machine with timer & sanitization
├── landing/                # Public marketing landing page components
│   ├── HeroProductMockup.tsx # Live platform preview mockup
│   └── LandingHelpers.tsx    # FAQ accordions, trust badges, feature callouts
├── dashboard/              # User dashboard feature modules
│   ├── home/               # Dashboard home client, action banners, & active feed
│   │   ├── DashboardHomeClient.tsx
│   │   ├── ActionRequiredBanner.tsx
│   │   └── ActiveDealsFeed.tsx
│   ├── deals/              # Deal list, contracts, milestones, dispute modal, steppers
│   │   └── DealProgressStepper.tsx
│   ├── wallet/             # Escrow ledger, bank accounts, withdrawal flow
│   ├── campaigns/          # Campaign creation wizard, applicant review
│   │   └── create/         # CreateCampaignClient, CampaignSummarySidebar, DeliverablesList
│   ├── messages/           # Deal-linked real-time chat & leak-protected messaging
│   ├── disputes/           # Evidence upload & arbitration timeline
│   ├── analytics/          # Reach, GMV, and conversion performance charts
│   └── settings/           # Profile settings, 2FA management, confirmation badges
├── admin/                  # Admin portal control panels & arbitration tools
├── analytics/              # Reusable Recharts wrapper components
├── notifications/          # Notification drawer & Web Push triggers
└── security/               # 2FA QR code modal & session revocations
```

### 2.2 Base UI Headless Primitives (`@base-ui/react`)
- VyaparMedia standardizes on `@base-ui/react` (v1.8.0) primitives styled exclusively with Tailwind CSS variables.
- **Barrel Import Rule**: All consumers **MUST** import primitives through `@/components/ui`:
  ```tsx
  import { Button, Modal, Card, Input, Toast, Select, EmptyState, Skeleton } from "@/components/ui";
  ```
- Primitives must never contain hardcoded domain business logic. They remain purely presentational, accessible (ARIA compliant, keyboard navigable), and theme-aware.

### 2.3 Responsive Navigation Shell Pattern
The application adapts seamlessly between desktop and mobile viewport constraints:
1. **Desktop Viewport (`md:` and above)**:
   - Renders `DesktopSidebar` on the left axis with role-differentiated menu groups (`INFLUENCER`, `BRAND`, `ADMIN`).
   - Displays real-time escrow wallet balances, collapsible section items, and quick action shortcuts.
2. **Mobile Viewport (below `md:`)**:
   - Renders `MobileBottomBar` pinned to the bottom of the screen.
   - Enforces **44pt minimum touch targets** (`.touch-target-44`) for all interactive icons and tabs.
   - Includes `padding-bottom: env(safe-area-inset-bottom)` to accommodate device home bars.
   - Pushes page content up via `pb-20 md:pb-0` to eliminate visual and tap interference.
3. **Escrow Stories Bar (`EscrowStoriesBar`)**:
   - Renders an Instagram-inspired horizontal scrollable story bar across feeds.
   - Showcases live platform escrow settlements, verified creator highlights, and system announcements.

### 2.4 Client vs. Server Component Boundaries
- **Server Component Page Shells (`page.tsx`)**: App Router route entrypoints must remain lightweight composability shells or Server Components that fetch initial data and validate sessions.
- **Interactive Feature Components (`"use client"`)**: Client boundaries must be pushed down to the leaf nodes or feature containers that manage state, form inputs, animations, or browser events.
- **No Monolithic Dashboard Files**: Page controllers must never exceed 250 lines; all complex UI logic must be decomposed into feature folders (`components/dashboard/<feature>/`).

### 2.5 Dual-Coded Accessibility & Numeric Precision
- **Dual-Coding**: Every status indicator or trust badge must pair a semantic color token (`verified`, `escrow`, `pending`, `disputed`) with a visible text label and Lucide icon. Never communicate status through color alone.
- **Tabular Numbers (`.tabular-nums`)**: All monetary figures, wallet counters, and percentage metrics must apply `.tabular-nums` (`font-variant-numeric: tabular-nums`) to prevent horizontal layout shift during counter animations.

### 2.6 Multi-Step Form Wizard Pattern (Kofluence / Upwork "Post a Job")
Complex multi-phase interactions (`src/app/onboarding/page.tsx`, `CreateCampaignClient.tsx`) must follow the progressive disclosure wizard pattern:
1. **Client State Machine**: An active step pointer (`currentStep: 1 | 2 | 3 | 4`) with explicit validation guards preventing forward advancement on incomplete data.
2. **Visual Stepper & Progress Bar**: Top-anchored visual stepper rendering completed checkmarks (`Check`, `bg-verified`), active ring indicator (`border-primary`), and upcoming muted steps.
3. **Sticky Summary Sidebar (Desktop)**: On desktop viewports, pair input forms with a sticky right sidebar (`CampaignSummarySidebar.tsx`) calculating real-time escrow deposits, platform fees (5%), and GST (18%) in bold `tabular-nums`.

### 2.7 Public-Facing PII Sanitization Boundary Pattern
Publicly accessible dynamic routes (`src/app/creator/[username]/page.tsx`) must strictly isolate sensitive private data:
1. **Server-Side Sanitization**: The Server Component invokes a dedicated formatter (`formatCreatorProfileData` in `src/lib/creator-profile.ts`) that extracts and validates only public marketing attributes.
2. **Strict Omission Policy**: Phone numbers, personal email addresses, PAN, GST, bank account numbers, residential addresses, and internal user flags are strictly stripped prior to serializing props to client components.

### 2.8 Server-Side Route Guard & Onboarding Completeness Pattern
To prevent orphan user journeys or incomplete profile access:
1. **Signup Funneling**: User registration immediately sets `callbackUrl=/onboarding` upon redirecting to `/login`.
2. **Dashboard Server Guard**: The root `src/app/dashboard/page.tsx` performs an atomic profile completeness check (verifying non-default categories, city, and required company/influencer attributes). If incomplete, it issues an immediate `redirect("/onboarding")`, ensuring new users cannot access dashboard features until completing onboarding.

### 2.9 Zero-Latency Categorized Search & Knowledge Base Pattern
Standalone help surfaces (`src/components/help/HelpCenterClient.tsx`) follow a high-concurrency client search pattern:
1. **Pure Filter Function (`filterFaqs`)**: Filter logic is decoupled into a pure, exported function tested independently via Vitest.
2. **Memoized Multi-Filter**: Uses React `useMemo` to filter across category pills (`GETTING_STARTED`, `PAYMENTS_ESCROW`, `DISPUTES_REVISIONS`, `KYC_SECURITY`) and real-time query substrings matching question, answer, and badge text simultaneously.
3. **Escalation Fallback**: Always pairs self-service documentation with an explicit escalation card linking directly to `/dashboard/support`.


---

## 3. Naming Conventions

| Entity | Convention | Example |
| :--- | :--- | :--- |
| **React Components** | **PascalCase** | `Button.tsx`, `Toast.tsx`, `Pagination.tsx`, `EscrowTrustCard.tsx` |
| **Component Sub-helpers** | **PascalCase** (with domain suffix) | `DealDetailHelpers.tsx`, `CampaignDetailHelpers.tsx` |
| **React Hooks** | **camelCase** (prefixed with `use`) | `useMessages.ts`, `useDealDetail.ts`, `useChartWidth.ts` |
| **Utility & Library Files** | **kebab-case** or **camelCase** | `utils-client.ts`, `clipboard.ts`, `contact-leak-detector.ts` |
| **Backend Services** | `{domain}.service.ts` | `deal.service.ts`, `wallet.service.ts`, `message.service.ts` |
| **Zod Schema Files** | `{domain}.schema.ts` | `deal.schema.ts`, `wallet.schema.ts`, `campaign.schema.ts` |
| **Next.js App Router Folders** | **kebab-case** or `[param]` | `deals/[id]/dispute/`, `audit-logs/`, `create/` |
| **Next.js App Router Files** | **Framework Lowercase** | `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `route.ts` |
| **TypeScript Types & Interfaces** | **PascalCase** | `interface DealDetail`, `type ToastType`, `type ApiResponse<T>` |
| **Constants** | **SCREAMING_SNAKE_CASE** | `ALL_CATEGORIES`, `DEFAULT_PAGE_SIZE`, `TRUST_TIER_LIMITS` |

---

## 4. Service-Layer Pattern (Backend)

The backend business logic adheres to the **Static Class Facade Pattern**:

### Structure:
```typescript
// src/services/wallet.service.ts
export class WalletService {
  private static readonly logger = logger.child({ service: "WalletService" });

  static async getBalance(userId: string) { ... }
  static async requestWithdrawal(userId: string, input: WithdrawInput) { ... }
}
```

### Domain Sub-folders:
- Single-file services (`auth.service.ts`, `message.service.ts`, `notification.service.ts`) are used for focused services.
- Sub-folder domains (`deal/`, `campaign/`, `application/`) are used when a domain has multiple high-complexity sub-flows:
  - Submodules handle specific actions (`create.ts`, `list.ts`, `action.ts`).
  - The root service file (`deal.service.ts`, `campaign.service.ts`, `application.service.ts`) serves as the public facade, delegating to internal submodules while providing a clean, cohesive API.

### Transaction Isolation & Escrow Guarantees:
- Any financial state transition (escrow locking, release, refund, withdrawal) **MUST** execute within an interactive `prisma.$transaction`.
- Database row locks (`SELECT ... FOR UPDATE`) and double-entry ledger recording (`WalletLedger` + `EscrowHold`) must be maintained at all times.

---

## 5. Export and Import Conventions

To eliminate inconsistency across the codebase, exports are strictly governed:

### Rule 1: Named Exports for All UI Components, Utilities, and Services
- All React components **MUST** be defined and exported as named exports:
  ```typescript
  export function Button({ variant, children }: ButtonProps) { ... }
  ```
- All services and utilities **MUST** use named exports:
  ```typescript
  export class DealService { ... }
  export function formatCurrency(amount: number): string { ... }
  ```
- *Backward compatibility:* For existing UI primitives, re-exporting default alongside named export is permitted (`export default ComponentName;`), but internal application code should prefer named imports (`import { Button, Modal } from "@/components/ui"`).

### Rule 2: Default Exports ONLY for Next.js App Router Special Files
- Next.js framework files require default exports:
  - `page.tsx` (`export default function Page() { ... }`)
  - `layout.tsx` (`export default function RootLayout() { ... }`)
  - `loading.tsx` (`export default function Loading() { ... }`)
  - `error.tsx` (`export default function ErrorBoundary() { ... }`)
  - `not-found.tsx` (`export default function NotFound() { ... }`)
- Never use default exports for regular internal components or service classes.

### Rule 3: Clean Path Aliasing
Always use the configured root alias `@/` instead of fragile relative paths:
- ✅ `import { Button } from "@/components/ui";`
- ✅ `import { DealService } from "@/services/deal.service";`
- ✅ `import { formatCurrency } from "@/lib/utils-client";`
- ❌ `import { Button } from "../../../components/ui/Button";`

---

## 6. Cross-Cutting Architectural Patterns (Canonical Standards)

To prevent code drift and ensure predictable development across all modules:

### 6.1 Unified Formatting Utilities (`src/lib/utils-client.ts`)
- **Currency (`formatCurrency`)**: All monetary figures MUST be parsed via `formatCurrency(amountInPaise)`. Never perform manual `Intl.NumberFormat` or inline `₹${...}` strings in components.
- **Dates (`formatDate`, `formatDateTime`, `formatTime`, `formatRelativeTime`)**: All calendar timestamps MUST use these shared helpers with consistent `en-IN` localization. Direct `.toLocaleDateString()` is strictly forbidden in UI components.
- **Numbers (`formatNumber`)**: Large counts (followers, views) use `formatNumber` to output clean Indian denominations (`10K`, `1.5L`, `1Cr`).

### 6.2 Standardized API Error Shape & Handling
- **Backend API Routes**: Standard error response envelope:
  ```json
  {
    "success": false,
    "error": "BAD_REQUEST",
    "message": "User-friendly, non-technical error description",
    "requestId": "req_xyz"
  }
  ```
- **Throwing Errors**: Throw typed `AppError` instances (`throw AppError.badRequest(...)`, `throw AppError.unauthorized(...)`). Caught automatically by `apiWrapper` with structured logging and metrics.
- **Client Consumption**: Client HTTP transport (`src/lib/api-client/http.ts`) unifies backend errors into `ApiClientError`, exposing `{ status, code, message }` and automatic 401 redirection to `/login`.

### 6.3 Fail-Fast Runtime Contract Safety (Zod Schemas)
- Every frontend API call must supply a Zod response schema:
  ```typescript
  export function listDeals() {
    return get("/api/deals", { schema: dealsListResponseSchema });
  }
  ```
- When using SWR or React Query, use `createSchemaFetcher(schema)`.
- If backend payload fields drift or rename, the client immediately throws `ZodError` at the boundary rather than corrupting UI state with `undefined`.

### 6.4 Skeleton Shimmer vs. Spinner Loading States
- **Data Loading (Pages, Cards, Feeds, Tables)**: MUST render shimmering `<Skeleton className="..." />` placeholders matching the geometric footprint of the expected content. Full-page or container-level spinners are forbidden.
- **Action Triggers (Buttons)**: `<Spinner size="sm" />` or button loading states (`loading={isSubmitting}`) are strictly reserved for inline user action feedback.

### 6.5 Modal & Sheet Base Component Family
- All dialogs must be built on `@/components/ui/Modal`:
  - Portalled to `document.body`
  - Framer Motion `AnimatePresence` with spring physics
  - Built-in Escape key listener and body scroll lock (`overflow-hidden`)
  - ARIA compliance (`role="dialog"`, `aria-modal="true"`)
- Mobile slide-up sheets extend this pattern via `@/components/discovery/FilterBottomSheet`.

### 6.6 Action-Button Rule (Premature-Exposure Prevention & UX Integrity)
**Core Mandate:** *Har naya state-changing button banate waqt, uska backend-rejection-condition pehle dhundo aur frontend-disabled-state me wire karo pehle hi — backend-error-response pe depend mat karo.*

#### The Anti-Pattern to Eliminate ("Premature Exposure"):
Leaving an action button enabled, letting the user fill forms or click with expectation of success, only to receive a toast or 400/403 `AppError` rejection from the backend (e.g., *"Wallet balance insufficient"*, *"Tax compliance required"*, *"Active dispute open"*, *"Product sample not received"*).

#### The 4-Pillar UX Standard:
1. **Never Completely Hide Feature Buttons**:
   - Do **NOT** hide action buttons just because prerequisites fail. If a feature exists (e.g. "Apply to Campaign", "Release Escrow Payment", "Cancel Deal", "Confirm Dispatch"), the user needs to know it exists.
   - *Only exception:* Genuinely inapplicable user actions (e.g., "Message Yourself" on your own profile).
2. **Disabled State When Prerequisites Fail**:
   - The button must be disabled: `disabled={isSubmitting || !eligibility.allowed}`.
3. **Inline Specific Reason ("Why")**:
   - Provide an immediate, contextual badge, tooltip, or inline message explaining the exact reason:
     - *"Wallet balance insufficient — need ₹X more"*
     - *"PAN tax compliance is required before withdrawals"*
     - *"Physical product must be marked as received before submitting content"*
     - *"Creator authenticity score (32/100) is below platform threshold of 40"*
4. **Direct Actionable Fix-It CTA**:
   - When a blocker can be resolved by the user, provide an instant link or action trigger:
     - `"Add Funds"` / `"Deposit ₹X"` → `/dashboard/wallet?topup=true`
     - `"Complete KYC"` → `/dashboard/settings?tab=verification`
     - `"View Dispute"` → `/dashboard/disputes`
     - `"Confirm Delivery"` → Product Logistics section

#### Single-Implementation Rule (`src/lib/action-eligibility.ts`):
- All business rejection conditions must be authored in a **shared predicate function** inside `@/lib/action-eligibility.ts`.
- Both the backend API handler/service and the frontend React component must import and use this exact same predicate. Never duplicate eligibility logic across layers.

---

## 7. Definition of Done Checklist for New Features

When writing new code or modifying existing code, verify against this checklist:

1. [ ] **File Location**: Is the component in the appropriate feature folder (`components/dashboard/<feature>/` or `components/ui/`)?
2. [ ] **File Casing**: Is the component file PascalCase (`MyNewCard.tsx`)?
3. [ ] **Export Style**: Does the component provide a named export (`export function MyNewCard`)?
4. [ ] **Service Pattern**: Is new backend business logic encapsulated in a static class service (`export class FeatureService`) in `src/services/`?
5. [ ] **Import Aliasing**: Are all imports utilizing `@/...` rather than deep `../../` relative paths?
6. [ ] **Formatting Utilities**: Does all currency and date rendering use `formatCurrency` and `formatDate` from `@/lib/utils-client`?
7. [ ] **Loading States**: Are skeleton shimmer loaders (`<Skeleton>`) used for asynchronous data fetching instead of raw full-page spinners?
8. [ ] **Action-Button Eligibility Gating**: Does every state-changing / API-triggering button pre-check backend rejection conditions using shared predicates from `src/lib/action-eligibility.ts`? Is it disabled with an inline "why" explanation and actionable fix-it CTA rather than blindly depending on backend runtime rejections?
9. [ ] **Type Integrity**: Does `npm run typecheck` pass with 0 diagnostics?
10. [ ] **Test Coverage**: Does `npm test` execute and pass 100% of the test suite?

