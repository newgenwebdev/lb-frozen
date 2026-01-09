import Image from "next/image";

export default function NewsletterFooter() {
  return (
    <div className="relative bg-linear-to-b from-[#C52129] via-[#8B3A8F] to-[#4A5BAC] overflow-hidden">
      {/* Three Elliptical Rings - Desktop */}
      <div
        className="hidden lg:block absolute rounded-full"
        style={{
          width: "800px",
          height: "800px",
          top: "-200px",
          right: "-200px",
          border: "50px solid rgba(255, 255, 255, 0.1)",
          zIndex: 1,
        }}
      ></div>
      <div
        className="hidden lg:block absolute rounded-full"
        style={{
          width: "600px",
          height: "600px",
          top: "-100px",
          right: "-100px",
          border: "40px solid rgba(255, 255, 255, 0.15)",
          zIndex: 1,
        }}
      ></div>
      <div
        className="hidden lg:block absolute rounded-full"
        style={{
          width: "400px",
          height: "400px",
          top: "0px",
          right: "0px",
          border: "30px solid rgba(255, 255, 255, 0.2)",
          zIndex: 1,
        }}
      ></div>

      {/* Three Elliptical Rings - Mobile */}
      <div
        className="lg:hidden absolute rounded-full"
        style={{
          width: "400px",
          height: "400px",
          top: "-100px",
          right: "-100px",
          border: "25px solid rgba(255, 255, 255, 0.1)",
          zIndex: 1,
        }}
      ></div>
      <div
        className="lg:hidden absolute rounded-full"
        style={{
          width: "300px",
          height: "300px",
          top: "-50px",
          right: "-50px",
          border: "20px solid rgba(255, 255, 255, 0.15)",
          zIndex: 1,
        }}
      ></div>
      <div
        className="lg:hidden absolute rounded-full"
        style={{
          width: "200px",
          height: "200px",
          top: "0px",
          right: "0px",
          border: "15px solid rgba(255, 255, 255, 0.2)",
          zIndex: 1,
        }}
      ></div>

      {/* Octopus Image - Desktop */}
      <div
        className="hidden lg:block absolute"
        style={{
          width: "600px",
          height: "600px",
          top: "-50px",
          right: "-100px",
          zIndex: 2,
        }}
      >
        <Image
          src="/octopus-bg-removed.png"
          alt="Octopus"
          fill
          className="object-contain"
        />
      </div>

      {/* Octopus Image - Mobile */}
      <div
        className="lg:hidden absolute"
        style={{
          width: "300px",
          height: "300px",
          top: "-25px",
          right: "-50px",
          zIndex: 2,
        }}
      >
        <Image
          src="/octopus-bg-removed.png"
          alt="Octopus"
          fill
          className="object-contain"
        />
      </div>

      <div className="mx-auto px-4 lg:px-6 py-8 lg:py-16 relative z-10">
        <div className="max-w-md">
          {/* LB Logo and Bartar Text */}
          <div className="flex items-center gap-3 lg:gap-4 mb-6 lg:mb-8">
            <div className="w-16 h-16 lg:w-20 lg:h-20 flex items-center">
              <Image
                src="/lb-logo.png"
                alt="LB Logo"
                width={200}
                height={200}
                className="object-contain"
              />
            </div>
            <span className="text-white text-3xl lg:text-4xl font-semibold">Bartar</span>
          </div>

          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-3 lg:mb-4">
            Stay connected
          </h2>
          <p className="text-white text-sm lg:text-base text-opacity-90 mb-6 lg:mb-8 leading-relaxed">
            Sign up for our newsletter to receive the latest news, updates, and
            insights on new products, flash sale, discount and moreg reat things
            from us
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <input
              type="email"
              placeholder="Enter your mail"
              className="flex-1 px-4 lg:px-6 py-2.5 lg:py-3 rounded-full bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white text-sm lg:text-base"
            />
            <button className="bg-[#C52129] text-white px-6 lg:px-8 py-2.5 lg:py-3 rounded-full font-semibold hover:bg-[#A01C22] transition-colors text-sm lg:text-base">
              Subscribe
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white bg-opacity-95 relative z-20">
        <div className="mx-auto px-4 lg:px-6 py-8 lg:py-12">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 lg:gap-8 mb-8">
            {/* Discover */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 lg:mb-4 text-sm lg:text-base">Discover</h3>
              <ul className="space-y-2 text-xs lg:text-sm text-gray-600">
                <li>
                  <a href="#" className="hover:text-gray-900">
                    FAQ Section
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-gray-900">
                    Order Tracking
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-gray-900">
                    Refund Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-gray-900">
                    Delivery Details
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-gray-900">
                    Customer Service
                  </a>
                </li>
              </ul>
            </div>

            {/* Seafood Selection */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 lg:mb-4 text-sm lg:text-base">
                Seafood Selection
              </h3>
              <ul className="space-y-2 text-xs lg:text-sm text-gray-600">
                <li>
                  <a href="#" className="hover:text-gray-900">
                    Product Categories
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-gray-900">
                    Weekly Specials
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-gray-900">
                    Seasonal Offers
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-gray-900">
                    Cooking Tips
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-gray-900">
                    Customer Testimonials
                  </a>
                </li>
              </ul>
            </div>

            {/* Sustainability */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 lg:mb-4 text-sm lg:text-base">
                Sustainability
              </h3>
              <ul className="space-y-2 text-xs lg:text-sm text-gray-600">
                <li>
                  <a href="#" className="hover:text-gray-900">
                    Eco-friendly sourcing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-gray-900">
                    Community support
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-gray-900">
                    Ocean conservation
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-gray-900">
                    Local fishing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-gray-900">
                    Partnerships
                  </a>
                </li>
              </ul>
            </div>

            {/* Ordering Process */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 lg:mb-4 text-sm lg:text-base">
                Ordering Process
              </h3>
              <ul className="space-y-2 text-xs lg:text-sm text-gray-600">
                <li>
                  <a href="#" className="hover:text-gray-900">
                    How to Order
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-gray-900">
                    Payment Options
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-gray-900">
                    Shipping Information
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-gray-900">
                    Order Confirmation
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-gray-900">
                    Contact Support
                  </a>
                </li>
              </ul>
            </div>

            {/* Fresh Deliveries */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 lg:mb-4 text-sm lg:text-base">
                Fresh Deliveries
              </h3>
              <ul className="space-y-2 text-xs lg:text-sm text-gray-600">
                <li>
                  <a href="#" className="hover:text-gray-900">
                    Same-Day Shipping
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-gray-900">
                    Subscription Service
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-gray-900">
                    Quality Assurance
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-gray-900">
                    Seafood Recipes
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-gray-900">
                    Cooking Classes
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Footer */}
          <div className="border-t border-gray-200 pt-4 lg:pt-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 text-xs lg:text-sm text-gray-600">
            <p>© 2025 - Alright reserved by Bartar</p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 lg:gap-6">
              <a
                href="mailto:bartar.official@gmail.com"
                className="flex items-center gap-2 hover:text-gray-900"
              >
                <svg
                  className="w-4 h-4 lg:w-5 lg:h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                bartar.official@gmail.com
              </a>
              <a
                href="tel:+2230-1233-123"
                className="flex items-center gap-2 hover:text-gray-900"
              >
                <svg
                  className="w-4 h-4 lg:w-5 lg:h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                +2230 - 1233 - 123
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
