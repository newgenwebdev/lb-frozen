// Shared layout helpers for the redesigned homepage sections

export const CONTAINER = "mx-auto w-full max-w-[1360px] px-4 sm:px-6 lg:px-8";

// Section ids used by the header navigation (sections also get `scroll-mt-20` for the sticky header)
export const SECTION_IDS = {
  top: "top",
  products: "products",
  flashSale: "flash-sale",
  process: "process",
  customers: "customers",
  about: "about",
  ordering: "ordering",
  quote: "quote",
  contact: "contact",
} as const;

export function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}
