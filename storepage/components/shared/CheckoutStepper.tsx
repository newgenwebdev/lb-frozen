interface CheckoutStepperProps {
  currentStep: "checkout" | "shipping" | "payment";
}

export function CheckoutStepper({ currentStep }: CheckoutStepperProps) {
  const steps = [
    {
      id: "checkout",
      label: "Checkout",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
        />
      ),
    },
    {
      id: "shipping",
      label: "Shipping",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
        />
      ),
    },
    {
      id: "payment",
      label: "Payment",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
        />
      ),
    },
  ];

  const getStepIndex = (step: string) => {
    const index = steps.findIndex((s) => s.id === step);
    return index;
  };

  const currentIndex = getStepIndex(currentStep);

  return (
    <div className="mb-8 px-10 pr-6">
      <div className="flex items-start gap-4 w-full">
        {steps.map((step, index) => {
          const isActive = index <= currentIndex;
          const isCurrentOrPast = index <= currentIndex;

          return (
            <div key={step.id} className="flex flex-col items-start flex-1">
              <svg
                className={`w-6 h-6 mb-2 ${
                  isActive ? "text-gray-900" : "text-gray-400"
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {step.icon}
              </svg>
              <div
                className={`w-full h-1 mb-3 ${
                  isCurrentOrPast ? "bg-gray-900" : "bg-gray-200"
                }`}
              />
              <span
                className={`text-sm font-medium ${
                  isActive ? "text-gray-900" : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
