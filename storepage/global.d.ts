import type { Locale } from "./i18n/config";
import type messages from "./messages/en.json";

// Type-safe translation keys for next-intl (en.json is the source of truth)
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}
