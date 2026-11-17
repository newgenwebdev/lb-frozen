// Product-range categories on the homepage.
// Names and examples are translated under HomeRedesign.products.items.<key> in messages/*.json.
export const PRODUCT_RANGE = [
  { key: "steamboat", temperature: "−18°C" },
  { key: "dimsum", temperature: "−18°C" },
  { key: "fries", temperature: "−18°C" },
  { key: "seafood", temperature: "−25°C" },
  { key: "meat", temperature: "−18°C" },
  { key: "chilled", temperature: "+4°C" },
] as const;

export type ProductRangeKey = (typeof PRODUCT_RANGE)[number]["key"];

export const PRODUCT_RANGE_KEYS = PRODUCT_RANGE.map((item) => item.key);
