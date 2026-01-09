# LB Frozen Admin Components

Reusable component library for the LB Frozen Admin Dashboard.

## Component Directory Structure

```
components/
├── ui/               # Generic UI components
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── DropdownMenu.tsx
│   ├── SearchInput.tsx
│   └── index.ts
└── admin/            # Admin-specific components
    ├── StatCard.tsx
    ├── SidebarMenuItem.tsx
    └── index.ts
```

## Usage Examples

### 1. Button Component

```tsx
import { Button } from "@/components/ui";

// Primary button with icon
<Button variant="primary" icon={<DownloadIcon />}>
  Export CSV
</Button>

// Secondary button
<Button variant="secondary" size="sm">
  Sort by ▾
</Button>

// Ghost button (no background)
<Button variant="ghost" onClick={handleMenuClick}>
  ⋯
</Button>
```

**Props:**
- `variant?: "primary" | "secondary" | "ghost"` - Button style (default: "primary")
- `size?: "sm" | "md" | "lg"` - Button size (default: "md")
- `icon?: React.ReactNode` - Optional left icon
- `disabled?: boolean` - Disabled state
- `onClick?: () => void` - Click handler
- `className?: string` - Additional Tailwind classes

---

### 2. Card Component

```tsx
import { Card } from "@/components/ui";

// Simple card
<Card>
  <p>Card content here</p>
</Card>

// Card with title and action menu
<Card
  title="Top Selling Products"
  action={<button onClick={handleMenu}>⋯</button>}
>
  <table>...</table>
</Card>

// Card with custom styling
<Card className="mb-6 md:mb-8">
  <div>Custom content</div>
</Card>
```

**Props:**
- `children: React.ReactNode` - Card content
- `className?: string` - Additional Tailwind classes
- `title?: string` - Optional header title
- `action?: React.ReactNode` - Optional action button/menu

---

### 3. StatCard Component

```tsx
import { StatCard } from "@/components/admin";

// Empty state
<StatCard title="Total Sales" isEmpty />

// With value
<StatCard title="Revenue" value="$24,541.32" />

// With custom content
<StatCard
  title="Today Profit Overview"
  value="$0"
  onMenuClick={() => console.log("menu clicked")}
>
  <div className="flex items-center gap-2">
    <span className="w-3 h-3 rounded-full bg-[#FFB800]"></span>
    <span className="font-inter text-[12px] text-[#666]">Avg</span>
  </div>
</StatCard>
```

**Props:**
- `title: string` - Card title (required)
- `value?: string | number` - Primary metric value
- `isEmpty?: boolean` - Shows "No data" placeholder
- `onMenuClick?: () => void` - Menu button handler
- `children?: React.ReactNode` - Custom content below value
- `className?: string` - Additional Tailwind classes

---

### 4. DropdownMenu Component

```tsx
import { DropdownMenu } from "@/components/ui";

const [dateFilter, setDateFilter] = useState("Today");

const dateOptions = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7days", label: "7 last days" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

<DropdownMenu
  items={dateOptions}
  value={dateFilter}
  onChange={setDateFilter}
  title="Date Selected"
  icon={<CalendarIcon />}
/>
```

**Props:**
- `items: { value: string; label: string }[]` - Menu options (required)
- `value: string` - Current selected value (required)
- `onChange: (value: string) => void` - Selection handler (required)
- `label?: string` - Custom button label (overrides selected value)
- `title?: string` - Dropdown header title (default: "Select Option")
- `icon?: React.ReactNode` - Optional button icon
- `className?: string` - Additional wrapper classes

**Features:**
- Auto-closes on outside click
- Radio-style selection indicators
- Hover states on options
- Responsive width (full on mobile, 240px on desktop)

---

### 5. SidebarMenuItem Component

```tsx
import { SidebarMenuItem } from "@/components/admin";

// Active menu item
<SidebarMenuItem
  href="/admin/overview"
  label="Overview"
  icon={<OverviewIcon />}
  isActive={true}
/>

// Collapsed mode (icon only)
<SidebarMenuItem
  href="/admin/products"
  label="Products"
  icon={<ProductIcon />}
  isCollapsed={true}
  title="Products"  // Shows as tooltip
/>

// Inactive item
<SidebarMenuItem
  href="/admin/orders"
  label="Orders"
  icon={<OrdersIcon />}
/>
```

**Props:**
- `href: string` - Link destination (required)
- `label: string` - Menu item text (required)
- `icon: React.ReactNode` - SVG icon (required)
- `isActive?: boolean` - Active state styling
- `isCollapsed?: boolean` - Icon-only mode
- `title?: string` - Tooltip text (defaults to label)

**Styling:**
- Active: border + background + shadow
- Inactive: hover states
- Responsive: auto-adjusts for collapsed sidebar

---

### 6. SearchInput Component

```tsx
import { SearchInput } from "@/components/ui";

const [search, setSearch] = useState("");

<SearchInput
  placeholder="Search orders..."
  value={search}
  onChange={setSearch}
/>
```

**Props:**
- `placeholder?: string` - Input placeholder (default: "Search data")
- `value: string` - Current value (required)
- `onChange: (value: string) => void` - Change handler (required)
- `className?: string` - Additional wrapper classes

**Features:**
- Built-in search icon
- Auto-focus on click
- Responsive width

---

## Refactoring Guide

### Before (Duplicated Code)

```tsx
// Stats cards - duplicated 3 times
<div className="bg-white border border-[#E5E5E5] rounded-lg p-4 md:p-6">
  <div className="flex items-center justify-between mb-4">
    <h4 className="font-inter text-[14px] font-medium text-black">Total sales</h4>
    <button className="text-[#999] hover:text-black">⋯</button>
  </div>
  <div className="h-[100px] flex items-center justify-center text-[#E5E5E5]">
    No data
  </div>
</div>
```

### After (Component-Based)

```tsx
<StatCard title="Total Sales" isEmpty onMenuClick={() => {}} />
```

**Code reduction:** 9 lines → 1 line (89% reduction per instance)

---

## Migration Checklist

### Overview Page (`app/admin/overview/page.tsx`)

- [ ] Replace date filter dropdown → `<DropdownMenu />`
- [ ] Replace "Export CSV" button → `<Button variant="primary" />`
- [ ] Replace 3 stat cards → `<StatCard />`
- [ ] Replace search input → `<SearchInput />`
- [ ] Replace sort/filter buttons → `<Button variant="secondary" />`

**Estimated reduction:** ~50 lines

### Admin Layout (`app/admin/layout.tsx`)

- [ ] Replace 12 menu items → `<SidebarMenuItem />`

**Estimated reduction:** ~150 lines

---

## Component Principles

1. **Tailwind-only styling** - No inline styles (follows `.clauderules`)
2. **Explicit return types** - All components return `React.JSX.Element`
3. **Font utilities** - Use `font-geist`, `font-public`, `font-inter` classes
4. **Accessibility** - ARIA attributes, cursor-pointer on interactive elements
5. **Responsive design** - Mobile-first with `sm:`, `md:`, `lg:` breakpoints
6. **TypeScript strict mode** - No `any` types, explicit prop types

---

## Next Components to Build

**High Priority:**
- `DataTable` - Reusable table with empty states
- `SidebarMenuSection` - Grouped menu sections (MENU, INVENTORY, OTHERS)

**Medium Priority:**
- `AdminHeader` - Extract sticky header from layout
- `AdminBreadcrumb` - Extract breadcrumb navigation
- `FilterButton` - Sort/Filter button wrapper

**Future:**
- `Icon` library - Extract 26+ inline SVGs
- `BarChart` - Chart component with real data
- `Modal` / `Dialog` - Overlay components
- `Toast` - Notification system

---

## Development Guidelines

- Test components in isolation before integrating
- Follow atomic design principles (atoms → molecules → organisms)
- Keep components simple and composable
- Use `cn()` utility for conditional classes (install `clsx` + `tailwind-merge`)
- Document props with JSDoc comments
- Add prop validation for required fields
