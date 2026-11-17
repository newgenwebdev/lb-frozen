export const locales = ["en", "zh"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

// Cookie that stores the visitor's chosen language
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: unknown): value is Locale {
  return locales.includes(value as Locale);
}

// Value used for the <html lang> attribute
export const htmlLang: Record<Locale, string> = {
  en: "en",
  zh: "zh-CN",
};
