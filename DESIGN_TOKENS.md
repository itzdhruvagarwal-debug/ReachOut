# VyaparMedia Design Tokens & Accessibility Specification

This document defines the visual design system, token contracts, typography, dark mode palettes, and accessibility standards for VyaparMedia — an influencer marketing & escrow marketplace.

---

## 1. Core Design Philosophy

- **Instagram-Inspired Cleanliness**: Minimal chrome, content-first layout, subtle neutral framing, perfectly rounded circular avatars (`rounded-full`), and soft, modern card radiuses (`rounded-2xl` / `rounded-xl`).
- **No Hardcoded Hex Values**: All components must consume Tailwind CSS tokens or CSS variables.
- **First-Class Dark Mode**: A deliberate OLED-slate dark palette (`#0B0D12` background, `#12151D` cards), never a naive light-to-dark color inversion.
- **High-Trust Financial Semantic Colors**: Dedicated semantic tokens for escrow lifecycle states: Escrow-Locked, Verified KYC, Pending Review, and Disputed.
- **Numeric Font Feature (`tabular-nums`)**: Tabular numeric digits prevent jitter and layout shift when wallet balances and counters animate or update.
- **Dual-Coding Accessibility**: Never rely solely on color to convey status. Every status badge or alert must pair a semantic color with an explicit textual label and a standard Lucide icon (e.g., `ShieldCheck`, `Lock`, `AlertTriangle`, `AlertCircle`).

---

## 2. Design Tokens Reference

### 2.1 Neutral Scale (Backgrounds & Text)

We avoid pure `#000000` and `#FFFFFF` to minimize eye fatigue and preserve photo contrast.

| Token | Light Mode Value | Dark Mode Value | Usage |
| :--- | :--- | :--- | :--- |
| `bg-background` | `#FAFAFA` (Off-white canvas) | `#0B0D12` (Deep OLED slate) | Page root / viewport canvas |
| `bg-card` | `#FFFFFF` (Clean elevated card) | `#12151D` (Slate surface) | Content cards, deal rows, modal dialogs |
| `bg-popover` | `#FFFFFF` | `#12151D` | Dropdowns, tooltips, popovers |
| `bg-muted` | `#F4F4F6` (Light pill bg) | `#191C26` (Subtle pill bg) | Inactive tabs, disabled inputs, pill badges |
| `text-foreground` | `#1B1B22` (Near-black) | `#F3F4F6` (Off-white) | Primary headings, profile handles, amounts |
| `text-muted-foreground`| `#6E7180` (Muted gray) | `#9497A7` (Muted slate) | Timestamps, subtitles, helper text, labels |
| `border-border` | `#E8E8EC` (Subtle hair-line) | `#222634` (Deep hairline) | Dividers, card borders, table separators |
| `border-input` | `#DFDFE5` | `#2A2F40` | Form input outlines |

### 2.2 Brand Accent

| Token | Light Mode Value | Dark Mode Value | Usage |
| :--- | :--- | :--- | :--- |
| `bg-primary` / `text-primary` | `#2563EB` (Electric Royal Blue) | `#3B82F6` (Luminous Royal Blue) | Primary CTA buttons, active tab indicators, brand logo accent |
| `text-primary-foreground` | `#FFFFFF` | `#FFFFFF` | Text inside primary buttons |

---

### 2.3 Semantic Trust Tokens (Escrow & Verification)

Financial statuses require clear semantic distinction. Each trust token provides `DEFAULT` (solid button/badge), `foreground` (high-contrast text), `muted` (subtle tint background), and `border` (subtle outline).

#### 🛡️ Verified KYC (`verified`)
- **Symbolism**: Security, approved KYC, safe payout account, authentic creator badge.
- **Paired Icon**: `<ShieldCheck className="w-4 h-4 text-verified" />`

| Subtoken | Light Mode | Dark Mode | WCAG AA Contrast vs Background |
| :--- | :--- | :--- | :--- |
| `bg-verified` | `#16A34A` (Green 600) | `#22C55E` (Green 500) | Solid badge background with `#FFFFFF` text (**> 4.5:1**) |
| `text-verified` | `#074526` (Deep Forest) | `#86EFAC` (Luminous Mint) | Text on `bg-verified-muted` (**> 6.2:1**) |
| `bg-verified-muted` | `#E6F8EE` (Mint Ice) | `#072C19` (Deep Pine) | Badge background container |
| `border-verified-border`| `#86EFAC` | `#14532D` | Outline border for verified cards/badges |

#### 🔒 Escrow-Locked (`escrow`)
- **Symbolism**: Funds locked in safe escrow holding, brand deposit confirmed, milestone funded.
- **Paired Icon**: `<Lock className="w-4 h-4 text-escrow" />`

| Subtoken | Light Mode | Dark Mode | WCAG AA Contrast vs Background |
| :--- | :--- | :--- | :--- |
| `bg-escrow` | `#1E40AF` (Navy/Sapphire) | `#3B82F6` (Luminous Cobalt) | Solid button or status marker |
| `text-escrow` | `#082F6B` (Midnight Blue) | `#93C5FD` (Sky Azure) | Text on `bg-escrow-muted` (**> 6.5:1**) |
| `bg-escrow-muted` | `#EBF3FE` (Ice Sapphire) | `#091E44` (Abyss Blue) | Badge / banner background |
| `border-escrow-border`| `#93C5FD` | `#1E3A8A` | Outline border |

#### ⏳ Pending Review (`pending`)
- **Symbolism**: Content submitted awaiting review, withdrawal request queued, approval pending.
- **Paired Icon**: `<AlertTriangle className="w-4 h-4 text-pending" />`

| Subtoken | Light Mode | Dark Mode | WCAG AA Contrast vs Background |
| :--- | :--- | :--- | :--- |
| `bg-pending` | `#D97706` (Warm Amber) | `#F59E0B` (Vibrant Amber) | Solid attention pill |
| `text-pending` | `#573402` (Deep Chestnut) | `#FDE68A` (Pale Gold) | Text on `bg-pending-muted` (**> 5.8:1**) |
| `bg-pending-muted` | `#FEF6D9` (Warm Cream) | `#372004` (Dark Amber Pit) | Badge / banner background |
| `border-pending-border`| `#FDE68A` | `#78350F` | Outline border |

#### ⚠️ Disputed / Action Required (`disputed`)
- **Symbolism**: Milestone rejected, funds frozen under arbitration, payment failed, fraud flag.
- **Paired Icon**: `<AlertCircle className="w-4 h-4 text-disputed" />`

| Subtoken | Light Mode | Dark Mode | WCAG AA Contrast vs Background |
| :--- | :--- | :--- | :--- |
| `bg-disputed` | `#DC2626` (Ruby Red) | `#EF4444` (Vibrant Crimson) | High-severity banner / alert button |
| `text-disputed` | `#610B13` (Deep Carmine) | `#FCA5A5` (Soft Rose) | Text on `bg-disputed-muted` (**> 7.0:1**) |
| `bg-disputed-muted` | `#FDEBED` (Soft Blush) | `#3F080E` (Deep Wine) | Badge / dispute card background |
| `border-disputed-border`| `#FCA5A5` | `#7F1D1D` | Outline border |

---

## 3. Typography & Numeric Precision

### 3.1 Font Family
- **Sans**: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- Optimized for Instagram-style rapid scanning of creators, bio handles, and deal requirements.

### 3.2 Numeric Jitter Prevention (`tabular-nums`)
For all financial values, wallet balances, escrow milestones, and counter animations:
- Utility class: `.tabular-nums`
- CSS rule: `font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1;`
- **Rule**: Never render a currency amount (`₹`) without `tabular-nums`.

```tsx
// Example Usage in Wallet Display
<span className="text-2xl font-bold tabular-nums text-foreground">
  ₹{walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
</span>
```

---

## 4. Spacing & Border Radius Scale

Instagram's visual aesthetic is characterized by soft corners on surfaces and circular avatars:

- **Avatars**: `rounded-full` (strictly circular)
- **Cards & Dialogs**: `rounded-2xl` (`1rem` / `16px`)
- **Buttons, Inputs & Badges**: `rounded-xl` (`0.75rem` / `12px`) or `rounded-lg` (`0.5rem` / `8px`)
- **Pills**: `rounded-full` (`9999px`)

---

## 5. Accessibility & Color-Blind Dual-Coding

Under WCAG 2.1 AA (Guideline 1.4.1 Use of Color):
> *Color is not used as the only visual means of conveying information, indicating an action, prompting a response, or distinguishing a visual element.*

### Pattern: Status Badge Component Specification

```tsx
import { ShieldCheck, Lock, AlertTriangle, AlertCircle } from "lucide-react";

interface StatusBadgeProps {
  status: "verified" | "escrow" | "pending" | "disputed";
  label: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const configs = {
    verified: {
      icon: ShieldCheck,
      container: "bg-verified-muted text-verified border-verified-border",
    },
    escrow: {
      icon: Lock,
      container: "bg-escrow-muted text-escrow border-escrow-border",
    },
    pending: {
      icon: AlertTriangle,
      container: "bg-pending-muted text-pending border-pending-border",
    },
    disputed: {
      icon: AlertCircle,
      container: "bg-disputed-muted text-disputed border-disputed-border",
    },
  };

  const config = configs[status];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.container}`}
      role="status"
    >
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
```

---

## 6. Component Architecture (Base UI Primitive)

VyaparMedia uses **Base UI** (`@base-ui/react`) primitives with Tailwind styling instead of Radix UI:
- Package: `@base-ui/react` (v1.8.0)
- Configured in `components.json` with style `"default"`, rsc: `true`, tailwind css variables: `true`.
- Allows headless accessibility with full CSS variable theming.
