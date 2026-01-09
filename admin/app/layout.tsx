import type { Metadata } from "next";
import { Inter, Public_Sans } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { ReactQueryProvider } from "@/lib/providers/react-query-provider";
import { AuthProvider } from "@/lib/providers/auth-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LB Bartar Admin",
  description: "Admin dashboard for LB Bartar e-commerce platform",
  icons: {
    icon: "/lb-logo.png",
    apple: "/lb-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${publicSans.variable} ${GeistSans.variable} antialiased`}>
        <AuthProvider>
          <ReactQueryProvider>{children}</ReactQueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
