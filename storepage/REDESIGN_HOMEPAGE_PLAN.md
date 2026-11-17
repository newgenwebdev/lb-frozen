# Homepage Redesign Plan

Redesign of the storefront homepage (`/`) based on the 9 mockup images supplied for the new LB Frozen Food look.
The new homepage is wholesale-first: it presents the product range, the cold-chain delivery process and who the company serves,
and turns visits into WhatsApp quote requests. Retail shoppers are still welcome and can still use the cart.

The previous homepage is **hidden, not deleted** (see [Reverting](#reverting-to-the-previous-design)).

---

## 1. Design language (from the mockups)

| Aspect | Observation | Implementation |
|--------|-------------|----------------|
| Page background | Warm cream | `--color-lb-cream: #F5F0E6` |
| Primary | Deep navy (hero, quote form, contact, headings) | `--color-lb-navy: #0E1F4D` |
| Accent | Red CTA, step numbers, eyebrow keywords | `--color-lb-red: #D2332A` |
| Lines | Hairline beige dividers and borders | `--color-lb-line: #E2DCCD` |
| Body text | Muted navy-grey | `--color-lb-muted: #5B6685` |
| Corners | Square or near-square (no pill buttons, no rounded cards) | `rounded-none` / `rounded-sm` |
| Typography | Heavy CJK headings, regular body, tabular numbers for stats and temperatures | `Noto Sans SC` via `next/font`, `tabular-nums` |
| Section header | Big H2 on the left, one-line description on the right, thick navy rule underneath | Shared `SectionHeader` component |

Tokens are defined once in `app/globals.css` (`@theme`) and used as `bg-lb-navy`, `text-lb-red`, etc.

---

## 2. Sections on the new homepage

Order follows the mockups. Each section has an anchor so the header navigation can scroll to it.

| # | Section | Anchor | Content |
|---|---------|--------|---------|
| 0 | **Header** (sticky) | – | Logo, "LB Frozen Food", subtitle "廖兄弟冷藏食品 · 批发零售". Anchor nav: 产品系列 · 冷链流程 · 服务对象 · 订货方式 · 关于我们 · 联系询价. EN/中文 toggle. Cart and login/account icons kept so shoppers can still check out |
| 1 | **Hero** (navy) | `#top` | Eyebrow "**批发** 供应餐饮商家 • **零售** 也欢迎散客自取". H1 "冷冻食品批发配送 / 让厨房不再担心断货". Company name, intro paragraph. CTAs: 索取报价单 (→ `#quote`) and 查看产品系列 (→ `#products`). Footnote: 批发送货最低 RM300 · 零售自取不设最低消费 · 当天确认. 2×2 feature grid: 全程冷链, 准时配送, 批发零售皆可, 认证合规 |
| 2 | **产品系列** (product range) | `#products` | Intro "常备品项约 400 种…". Six rows, each with a storage temperature, Chinese name + English subtitle, example items, and a **加入清单** (add to list) button |
| 3 | **Today's flash deals** | `#flash-sale` | Live flash-sale products from the backend, kept in the current site's red style (countdown, product cards, add to cart) |
| 4 | **冷链流程** (delivery process) | `#process` | "一张订单怎么配送?" and four numbered steps: 收到订单 → 准备送往运输中心 → 运输中心按地区安排配送 → 包裹安全送达 |
| 5 | **服务对象** (who we serve) | `#customers` | Eight customer-type chips, plus four stats: 2005 创立年份 · 400+ 常备品项 · 20+ 入行年数 · 300+ 长期客户 |
| 6 | **关于我们** (about us) | `#about` | Lead paragraph and two story paragraphs |
| 7 | **订货方式** (how to order) | `#ordering` | Three bulleted columns: 下单 (ordering), 付款 (payment), 送货与退换 (delivery & returns) |
| 8 | **索取报价单** (request a quote, navy) | `#quote` | Form: 联络人, 店号/公司, 联络电话, 需要的类别, 备注. The "用 WhatsApp 发送" button opens WhatsApp with the message pre-written. Nothing is stored |
| 9 | **Contact** (navy) | `#contact` | WhatsApp/phone, email, warehouse address, ordering and pickup hours. Company info card: registered name, registration no., warehouse, delivery area, payment methods |
| 10 | **Footer bar** | – | © year + registered name · Chinese company name and location |
| – | **Floating quote-list button** | – | Bottom-right, with a counter badge. Scrolls to the quote form |

### Product range rows

| Temp. | 中文 | English | Examples |
|-------|------|---------|----------|
| −18°C | 火锅料 / 鱼丸类 | Steamboat & surimi | 鱼丸、腐竹卷、芝士豆腐、龙虾丸、炸云吞、贡丸 |
| −18°C | 点心类 | Dim sum | 烧卖、虾饺、叉烧包、春卷、咖喱角 |
| −18°C | 薯类炸物 | Fries & snacks | 直切薯条、细薯条、薯饼、鸡块、洋葱圈 |
| −25°C | 冷冻海鲜 | Seafood | 白虾、苏东圈、多利鱼柳、巴沙鱼片、青口、蟹柳 |
| −18°C | 肉类家禽 | Meat & poultry | 全鸡与分割鸡、牛羊肉片、香肠、腌制肉品 |
| +4°C | 冷藏与干货 | Chilled & dry goods | 酱料、火锅蘸酱、食用油、包装与一次性餐具 |

### Quote list flow

1. **加入清单** on a product-range row adds that category to a quote list. Pressing it again removes it.
2. The floating button shows how many categories are in the list.
3. The quote form's 需要的类别 field is pre-filled from the list. Categories can also be added or removed in the form.
4. Submitting opens `wa.me/<number>?text=<message>` in a new tab. The message lists the contact details, categories and notes.

The list is saved in the visitor's browser (`localStorage`). It is separate from the shopping cart.

---

## 3. What happens to the current homepage

| Current section | New homepage |
|-----------------|--------------|
| ProtectedNavbar | Hidden on `/`; replaced by the new header. Still used on all other pages |
| Hero banner carousel | Hidden |
| Browse categories | Hidden (the 产品系列 section replaces it) |
| Today's flash deals | **Kept** (section 3) |
| Products on trend this month | Hidden |
| Top products by categories | Hidden |
| Photo reviews | Hidden |
| NewsletterFooter | Hidden on `/`; replaced by the contact section and footer bar. Still used on all other pages |

---

## 4. Code structure

```
storepage/
├── app/page.tsx                         # Thin switch: redesign or legacy
├── lib/config/home.ts                   # HOME_VARIANT = "redesign" | "legacy"
├── lib/data/company.ts                  # Phone, email, address, reg. no., WhatsApp helper
├── lib/data/productRange.ts             # The 6 product-range categories
├── lib/stores/quoteListStore.ts         # Quote list (Zustand + persist)
├── lib/fonts.ts                         # Noto Sans SC
├── components/home/legacy/
│   └── LegacyHomePage.tsx               # Previous homepage, unchanged
└── components/home/redesign/
    ├── RedesignHomePage.tsx             # Composes the sections below
    ├── SectionHeader.tsx
    ├── HomeHeader.tsx
    ├── HeroSection.tsx
    ├── ProductRangeSection.tsx
    ├── FlashDealsSection.tsx
    ├── ProcessSection.tsx
    ├── CustomersSection.tsx
    ├── AboutSection.tsx
    ├── OrderingSection.tsx
    ├── QuoteFormSection.tsx
    ├── ContactSection.tsx               # Includes the footer bar
    └── QuoteListButton.tsx
```

- All copy is bilingual through next-intl, in the `HomeRedesign` namespace of `messages/en.json` and `messages/zh.json`.
- The Chinese copy is taken from the mockups. The English copy is a translation of it.
- `LanguageSwitcher` gains a `variant="toggle"` mode (a square EN/中文 button, as in the mockup). The dropdown used by ProtectedNavbar is unchanged.

---

## Reverting to the previous design

In `storepage/lib/config/home.ts`, change:

```ts
export const HOME_VARIANT: HomeVariant = "redesign";
```

to `"legacy"`. The old homepage, with its navbar, footer and all sections, renders exactly as before.
None of the other pages are affected by either setting.

---

## 5. Open questions for the business

These don't block the work. The defaults below are in place until the business confirms.

| Question | Current default |
|----------|-----------------|
| WhatsApp number. 03-62772009 is a landline, so WhatsApp may not work on it | Uses 03-62772009. Change `whatsappNumber` in `lib/data/company.ts` |
| One row of the company info card is blurred in the mockup | Left out |
| Stats (2005 / 400+ / 20+ / 300+) and the HALAL / MeSTI claim | Taken from the mockup; need confirming |
| Footer location: the mockup says 马来西亚雪兰莪 (Selangor), but the warehouse is in Kuala Lumpur | 吉隆坡 (Kuala Lumpur), to match the address |
| Delivery area and payment methods | Taken from the mockup: 巴生谷一带 (Klang Valley); cash, DuitNow, 30-day credit |
| Light/dark theme toggle in the mockup | Not included; light theme only |
