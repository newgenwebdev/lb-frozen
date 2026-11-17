import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import "./globals.css";
import { htmlLang } from "@/i18n/config";
import { AuthProvider } from "@/lib/AuthContext";
import { CartProvider } from "@/lib/CartContext";
import { WishlistProvider } from "@/lib/WishlistContext";
import { ToastProvider } from "@/components/ui/toast";
import { QueryProvider } from "@/lib/providers/QueryProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LB Frozen - Premium Frozen Food",
  description: "Buy premium frozen seafood products online",
  icons: {
    icon: "/lb-logo.png",
    apple: "/lb-logo.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html lang={htmlLang[locale]}>
      <body
        className={`${inter.variable} font-sans antialiased`}
      >
        <NextIntlClientProvider>
          <QueryProvider>
            <AuthProvider>
              <CartProvider>
                <WishlistProvider>
                  <ToastProvider>
                    {children}
                  </ToastProvider>
                </WishlistProvider>
              </CartProvider>
            </AuthProvider>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
