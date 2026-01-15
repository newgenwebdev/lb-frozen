import ProtectedNavbar from "@/components/layout/ProtectedNavbar";
import NewsletterFooter from "@/components/shared/NewsletterFooter";
import { SimilarItemsWrapper } from "@/components/shared/SimilarItemsWrapper";

export default function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <ProtectedNavbar />
      {children}
      
      {/* Similar Items Section */}
      <div className="relative bg-[#C52129] py-8 lg:py-12 pb-32 lg:pb-48 overflow-hidden">
        {/* Elliptical Rings for transition - Desktop */}
        <div
          className="hidden lg:block absolute rounded-full"
          style={{
            width: "800px",
            height: "800px",
            bottom: "-600px",
            right: "-200px",
            border: "50px solid rgba(255, 255, 255, 0.1)",
            zIndex: 0,
          }}
        ></div>
        <div
          className="hidden lg:block absolute rounded-full"
          style={{
            width: "600px",
            height: "600px",
            bottom: "-500px",
            right: "-100px",
            border: "40px solid rgba(255, 255, 255, 0.15)",
            zIndex: 0,
          }}
        ></div>
        <div
          className="hidden lg:block absolute rounded-full"
          style={{
            width: "400px",
            height: "400px",
            bottom: "-400px",
            right: "0px",
            border: "30px solid rgba(255, 255, 255, 0.2)",
            zIndex: 0,
          }}
        ></div>

        {/* Elliptical Rings for transition - Mobile */}
        <div
          className="lg:hidden absolute rounded-full"
          style={{
            width: "400px",
            height: "400px",
            bottom: "-300px",
            right: "-100px",
            border: "25px solid rgba(255, 255, 255, 0.1)",
            zIndex: 0,
          }}
        ></div>
        <div
          className="lg:hidden absolute rounded-full"
          style={{
            width: "300px",
            height: "300px",
            bottom: "-250px",
            right: "-50px",
            border: "20px solid rgba(255, 255, 255, 0.15)",
            zIndex: 0,
          }}
        ></div>
        <div
          className="lg:hidden absolute rounded-full"
          style={{
            width: "200px",
            height: "200px",
            bottom: "-200px",
            right: "0px",
            border: "15px solid rgba(255, 255, 255, 0.2)",
            zIndex: 0,
          }}
        ></div>

        <div className="mx-auto px-4 lg:px-6 pb-8 lg:pb-12 relative z-10">
          {/* Similar items carousel */}
          <SimilarItemsWrapper />
        </div>
      </div>

      <NewsletterFooter />
    </div>
  );
}
