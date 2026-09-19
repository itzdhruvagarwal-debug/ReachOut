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

## 2. Component Organization & Feature-Folder Pattern

### Rules:
1. **Feature-Folder Scoping**:
   - Components specific to a functional area **MUST** reside within that feature's folder under `src/components/dashboard/<feature>/` (e.g., `deals/`, `wallet/`, `messages/`, `campaigns/`, `disputes/`, `settings/`, `challenges/`, `referrals/`).
   - Feature folders group related modals, timeline items, helpers, and sub-views together.
2. **UI Primitives Barrels**:
   - Primitives reside in `src/components/ui/` (e.g., `Button.tsx`, `Modal.tsx`, `Toast.tsx`, `Input.tsx`, `Card.tsx`, `Pagination.tsx`).
   - `src/components/ui/index.ts` is the single source of truth for UI primitives. All consumers should import primitives via `@/components/ui`.
3. **No Monolithic Dashboard Files**:
   - Next.js route entrypoints (`page.tsx`) should act as thin controllers or composition shells that pull in modular feature components.

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

## 6. Definition of Done Checklist for New Features

When writing new code or modifying existing code, verify against this checklist:

1. [ ] **File Location**: Is the component in the appropriate feature folder (`components/dashboard/<feature>/` or `components/ui/`)?
2. [ ] **File Casing**: Is the component file PascalCase (`MyNewCard.tsx`)?
3. [ ] **Export Style**: Does the component provide a named export (`export function MyNewCard`)?
4. [ ] **Service Pattern**: Is new backend business logic encapsulated in a static class service (`export class FeatureService`) in `src/services/`?
5. [ ] **Import Aliasing**: Are all imports utilizing `@/...` rather than deep `../../` relative paths?
6. [ ] **Type Integrity**: Does `npm run typecheck` pass with 0 diagnostics?
7. [ ] **Test Coverage**: Does `npm test` execute and pass 100% of the test suite?
