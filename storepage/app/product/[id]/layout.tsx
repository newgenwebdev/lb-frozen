import ProtectedNavbar from "@/components/layout/ProtectedNavbar";
import NewsletterFooter from "@/components/shared/NewsletterFooter";

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

        <div className="max-w-7xl mx-auto px-4 lg:px-6 relative z-10">
          <div className="flex items-center justify-between mb-6 lg:mb-8">
            <h2 className="text-2xl lg:text-4xl font-bold text-white">Similar items</h2>
            <div className="flex gap-2">
              <button className="w-10 h-10 lg:w-12 lg:h-12 bg-white rounded-full flex items-center justify-center hover:bg-gray-100">
                <svg
                  className="w-4 h-4 lg:w-5 lg:h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <button className="w-10 h-10 lg:w-12 lg:h-12 bg-white rounded-full flex items-center justify-center hover:bg-gray-100">
                <svg
                  className="w-4 h-4 lg:w-5 lg:h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Similar items content will be here - you can move the grid here or make it dynamic */}
          <div className="text-white text-center py-6 lg:py-8">
            Similar items section - content can be added here
          </div>
        </div>
      </div>

      <NewsletterFooter />
    </div>
  );
}
