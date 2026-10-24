"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Menu, ShoppingCart, User, X } from "lucide-react";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";
import { useAuthContext } from "@/lib/AuthContext";
import { useCartContext } from "@/lib/CartContext";
import { COMPANY } from "@/lib/data/company";
import { CONTAINER, SECTION_IDS, scrollToSection } from "./layout";

const NAV_ITEMS = [
  { key: "products", id: SECTION_IDS.products },
  { key: "process", id: SECTION_IDS.process },
  { key: "customers", id: SECTION_IDS.customers },
  { key: "ordering", id: SECTION_IDS.ordering },
  { key: "about", id: SECTION_IDS.about },
  { key: "contact", id: SECTION_IDS.contact },
] as const;

export default function HomeHeader() {
  const t = useTranslations("HomeRedesign.header");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { customer, loading: authLoading } = useAuthContext();
  const { cartCount } = useCartContext();

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    setIsMenuOpen(false);
    scrollToSection(id);
  };

  return (
    <header className="sticky top-0 z-50 bg-lb-paper/95 backdrop-blur border-b border-lb-line">
      <div className={`${CONTAINER} flex items-center gap-4 h-16 lg:h-20`}>
        {/* Brand */}
        <a
          href={`#${SECTION_IDS.top}`}
          onClick={(e) => handleNavClick(e, SECTION_IDS.top)}
          className="flex items-center gap-3 shrink-0"
        >
          <Image
            src="/lb-logo.png"
            alt={t("logoAlt")}
            width={72}
            height={48}
            priority
            className="h-9 lg:h-11 w-auto"
          />
          {/* Logo alone on phones, so the action buttons fit */}
          <span className="hidden sm:flex flex-col leading-tight">
            <span className="text-sm lg:text-base font-bold text-lb-navy">
              {COMPANY.brandName}
            </span>
            <span className="text-[11px] lg:text-xs text-lb-muted tracking-wide">
              {t("brandSubtitle")}
            </span>
          </span>
        </a>

        {/* Desktop navigation */}
        <nav className="hidden xl:flex items-center gap-7 ml-auto">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.key}
              href={`#${item.id}`}
              onClick={(e) => handleNavClick(e, item.id)}
              className="text-[15px] text-lb-navy/80 hover:text-lb-navy transition-colors whitespace-nowrap"
            >
              {t(`nav.${item.key}`)}
            </a>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-auto xl:ml-6">
          <LanguageSwitcher variant="toggle" />

          <Link
            href="/cart"
            aria-label={t("cart")}
            className="relative w-9 h-9 border border-lb-line bg-white flex items-center justify-center text-lb-navy hover:border-lb-navy transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-4.5 h-4.5 px-1 bg-lb-red text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>

          {authLoading ? (
            <div className="w-9 h-9 bg-lb-line/60 animate-pulse" />
          ) : (
            <Link
              href={customer ? "/profile" : "/login"}
              aria-label={customer ? t("account") : t("login")}
              className="h-9 px-2.5 sm:px-3 border border-lb-line bg-white flex items-center gap-2 text-sm text-lb-navy hover:border-lb-navy transition-colors"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">
                {customer ? customer.first_name || t("account") : t("login")}
              </span>
            </Link>
          )}

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-label={isMenuOpen ? t("closeMenu") : t("openMenu")}
            aria-expanded={isMenuOpen}
            className="xl:hidden w-9 h-9 flex items-center justify-center text-lb-navy cursor-pointer"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation (overlays the page so closing it doesn't shift the scroll target) */}
      {isMenuOpen && (
        <nav className="xl:hidden absolute inset-x-0 top-full border-y border-lb-line bg-lb-paper shadow-lg shadow-lb-navy/10">
          <div className={`${CONTAINER} py-2`}>
            {NAV_ITEMS.map((item) => (
              <a
                key={item.key}
                href={`#${item.id}`}
                onClick={(e) => handleNavClick(e, item.id)}
                className="block py-3 border-b border-lb-line last:border-b-0 text-base text-lb-navy"
              >
                {t(`nav.${item.key}`)}
              </a>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
