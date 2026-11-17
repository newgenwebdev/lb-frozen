import { notoSansSC } from "@/lib/fonts";
import HomeHeader from "./HomeHeader";
import HeroSection from "./HeroSection";
import ProductRangeSection from "./ProductRangeSection";
import FlashDealsSection from "./FlashDealsSection";
import ProcessSection from "./ProcessSection";
import DeliveryCheckSection from "./DeliveryCheckSection";
import CustomersSection from "./CustomersSection";
import AboutSection from "./AboutSection";
import OrderingSection from "./OrderingSection";
import QuoteFormSection from "./QuoteFormSection";
import ContactSection from "./ContactSection";
import QuoteListButton from "./QuoteListButton";

// Redesigned homepage (see REDESIGN_HOMEPAGE_PLAN.md)
export default function RedesignHomePage() {
  return (
    <div
      className={`${notoSansSC.variable} font-home min-h-screen bg-lb-cream text-lb-navy`}
    >
      <HomeHeader />
      <main>
        <HeroSection />
        <ProductRangeSection />
        <FlashDealsSection />
        <ProcessSection />
        <DeliveryCheckSection />
        <CustomersSection />
        <AboutSection />
        <OrderingSection />
        <QuoteFormSection />
        <ContactSection />
      </main>
      <QuoteListButton />
    </div>
  );
}
