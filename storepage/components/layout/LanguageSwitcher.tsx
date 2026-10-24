"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { locales, type Locale } from "@/i18n/config";
import { setUserLocale } from "@/i18n/locale";

const shortLabels: Record<Locale, string> = {
  en: "EN",
  zh: "中文",
};

interface LanguageSwitcherProps {
  // "dropdown": globe + menu (default). "toggle": square button showing the other language.
  variant?: "dropdown" | "toggle";
  className?: string;
}

export default function LanguageSwitcher({
  variant = "dropdown",
  className = "",
}: LanguageSwitcherProps) {
  const t = useTranslations("LanguageSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleChange = (nextLocale: Locale) => {
    if (nextLocale === locale) return;
    startTransition(async () => {
      await setUserLocale(nextLocale);
      // Re-render server components with the new locale
      router.refresh();
    });
  };

  if (variant === "toggle") {
    const nextLocale = locales.find((item) => item !== locale) ?? locale;
    return (
      <button
        type="button"
        aria-label={t("label")}
        disabled={isPending}
        onClick={() => handleChange(nextLocale)}
        lang={nextLocale === "zh" ? "zh-CN" : "en"}
        className={`min-w-11 h-9 px-2.5 border border-lb-line bg-white text-sm font-medium text-lb-navy hover:border-lb-navy transition-colors cursor-pointer ${
          isPending ? "opacity-50" : ""
        } ${className}`}
      >
        {shortLabels[nextLocale]}
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={t("label")}
          disabled={isPending}
          className={`flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors outline-none ${
            isPending ? "opacity-50" : ""
          }`}
        >
          <svg
            className="w-5 h-5 lg:w-6 lg:h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
            />
          </svg>
          <span className="text-xs lg:text-sm font-medium">
            {shortLabels[locale]}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {locales.map((item) => (
          <DropdownMenuItem
            key={item}
            onClick={() => handleChange(item)}
            className={item === locale ? "font-semibold text-[#23429B]" : ""}
          >
            <span className="flex-1">{t(item)}</span>
            {item === locale && (
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
