# LB Frozen Storepage — Design System

## Stack

- Next.js 16, React 19, TypeScript strict
- Tailwind CSS 4 + tw-animate-css (CSS animations only — no Framer Motion)
- lucide-react icons
- @radix-ui primitives (Dialog, Select, Collapsible, etc.)
- Inter font via `next/font/google`

---

## Fonts

```
Inter → CSS var: --font-inter
Applied: className={`${inter.variable} font-sans antialiased`} on <body>
```

Use Tailwind's text-size scale only. No custom `font-size` values.

---

## Colors

### Brand (hardcoded)
| Token | Value | Usage |
|-------|-------|-------|
| Red | `#C52129` | Flash sale, badges, CTA primary, section eyebrows |
| Blue | `#23429B` | Trending section, tabs, active states |
| Dark Blue | `#203C8D` | Promo card gradients, slider |
| Purple | `#8B3A8F` | Gradient midpoint (newsletter footer) |

### Semantic (CSS vars via Tailwind)
- Background: `bg-background` / `bg-white` / `bg-gray-50`
- Primary text: `text-gray-900`
- Secondary text: `text-gray-600`
- Muted text: `text-gray-500`
- Border: `border-gray-200`

### Status
- Error/destructive: `text-red-600` / `bg-destructive`
- Star rating: `text-yellow-400`
- Wishlist active: `text-red-500`

---

## Typography

| Role | Classes |
|------|---------|
| Hero h1 | `text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight leading-tight` |
| Section eyebrow | `text-[#C52129] text-sm font-semibold tracking-wider uppercase` |
| Section h2 | `text-2xl lg:text-4xl font-bold text-gray-900 tracking-tight` |
| Card heading | `text-lg font-bold text-gray-900` |
| Body | `text-sm text-gray-600 leading-relaxed` |
| Muted | `text-sm text-gray-500` |
| Label | `text-sm font-medium text-gray-700` |
| Section header label | `text-xs font-medium tracking-wide text-gray-900 uppercase` |

---

## Layout

### Containers
- Wide: `max-w-7xl mx-auto px-4 lg:px-6` (homepage, product listings)
- Narrow: `max-w-3xl mx-auto` (FAQ, legal pages, forms)
- Page shell: `min-h-screen bg-gray-50`

### Section spacing
- Section padding: `py-8 lg:py-12` or `py-10 lg:py-16`
- Internal gap: `gap-4`, `gap-6`, `space-y-4`, `space-y-6`
- Card internal: `p-6` or `p-4 lg:p-6`

### Breadcrumb strip
```tsx
<div className="bg-white px-4 lg:px-6 pt-4">
  <Breadcrumb items={[...]} />
</div>
```

### Common grids
- 4-col products: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6`
- 3-col: `grid grid-cols-1 md:grid-cols-3 gap-6`
- 2-col contact cards: `grid grid-cols-1 md:grid-cols-2 gap-4`

---

## Components (ui/)

| Component | File | Key classes |
|-----------|------|-------------|
| Button | `components/ui/button.tsx` | variants: default, outline, ghost, destructive, secondary, link |
| Input | `components/ui/input.tsx` | `h-9 rounded-md border px-3 focus-visible:ring-[3px]` |
| Card | `components/ui/card.tsx` | `rounded-xl border bg-card shadow-sm` |
| Badge | `components/ui/badge.tsx` | `rounded-full px-2 py-0.5 text-xs font-medium` |
| Checkbox | `components/ui/checkbox.tsx` | `size-4 rounded-full border` |
| Select | `components/ui/select.tsx` | `h-9 rounded-md border px-3 text-sm` |
| Breadcrumb | `components/shared/Breadcrumb.tsx` | `text-xs sm:text-sm text-gray-600` |
| ProductCard | `components/shared/ProductCard.tsx` | `rounded-xl bg-white hover:shadow-lg transition-shadow` |
| Navbar | `components/layout/ProtectedNavbar.tsx` | used on all public pages |
| Footer | `components/shared/NewsletterFooter.tsx` | gradient newsletter + nav |

### Button patterns
```tsx
// Primary CTA
<button className="bg-[#C52129] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#a51b22] transition-colors cursor-pointer">

// Secondary
<button className="bg-white border border-gray-200 text-gray-900 px-6 py-3 rounded-full font-semibold hover:bg-gray-50 transition-colors cursor-pointer">

// Ghost/outline (via Button component)
<Button variant="outline" className="text-gray-700 border-gray-300 hover:bg-gray-50">
```

---

## Accordion (CSS-only, no Framer Motion)

Grid-rows trick for smooth height animation:
```tsx
<div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
  isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
}`}>
  <div className="overflow-hidden">
    {/* content */}
  </div>
</div>
```

Icon rotation:
```tsx
<ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
```

Note: `grid-rows-[0fr]` and `grid-rows-[1fr]` must appear as full literal strings in source for Tailwind JIT to detect them.

---

## Animations

Source: `tw-animate-css` (imported in globals.css). No Framer Motion.

- Transitions: `transition-all duration-200`, `transition-colors`, `transition-shadow`
- State animations: `data-[state=open]:animate-in data-[state=closed]:animate-out`
- Loading: `animate-pulse` on skeleton placeholders
- Banner slide: `transition-transform duration-700 ease-in-out`

---

## Rules

1. **No inline styles** — Tailwind only. Exception: decorative SVG/background positioning in NewsletterFooter (legacy).
2. **Explicit text colors always** — never rely on inherited color.
3. **`cursor-pointer`** on all clickable non-`<button>` elements.
4. **`"use client"`** only when using `useState`, `useEffect`, `useRef`, browser APIs, or event handlers.
5. **Internal links** → `<Link>` from `next/link`, never `<a href>`.
6. **`ProtectedNavbar`** on all public pages (handles logged-in + logged-out state).
7. **No `any`** — use `unknown` + type guards.
8. **Explicit return types** on all functions.

---

## Page template (public info page)

```tsx
"use client";

import ProtectedNavbar from "@/components/layout/ProtectedNavbar";
import NewsletterFooter from "@/components/shared/NewsletterFooter";
import Breadcrumb from "@/components/shared/Breadcrumb";

export default function MyPage(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-gray-50">
      <ProtectedNavbar />
      <div className="bg-white px-4 lg:px-6 pt-4">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Page Title" }]} />
      </div>
      {/* Hero */}
      <div className="bg-white px-4 lg:px-6 py-10 lg:py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">Title</h1>
        </div>
      </div>
      {/* Content */}
      <div className="px-4 lg:px-6 py-10 lg:py-16">
        <div className="max-w-3xl mx-auto">
          {/* ... */}
        </div>
      </div>
      <NewsletterFooter />
    </div>
  );
}
```
