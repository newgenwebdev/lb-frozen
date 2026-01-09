import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CartProvider } from "@/lib/context/CartContext";
import { CustomerProvider } from "@/lib/context/CustomerContext";
import { CartAuthSync } from "@/components/cart/CartAuthSync";
import { Toaster } from "@/components/ui/Toaster";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "KINGJESS - Daily Essential",
  description:
    "Discover your daily essential skincare routine with KINGJESS. Premium quality products crafted for healthy, radiant skin every day.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <CustomerProvider>
          <CartProvider>
            <CartAuthSync />
            <Header />
            {children}
            <Footer />
            <Toaster />
          </CartProvider>
        </CustomerProvider>
      </body>
    </html>
  );
}
