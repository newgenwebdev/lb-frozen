"use client";

import { useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Button from "@/components/shared/Button";

function OTPContent() {
  const searchParams = useSearchParams();
  const [otp, setOtp] = useState(["", "", "", "", ""]);
  // Get email from URL params or use empty string
  const emailFromParams = searchParams.get("email") || "";
  const [email, setEmail] = useState(emailFromParams);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto focus next input
    if (value && index < 4) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("OTP:", otp.join(""));
  };

  const handleResendCode = () => {
    console.log("Resending code...");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="flex items-center justify-center px-8 py-20">
        <div className="w-full max-w-xl bg-white px-12 py-16 shadow-sm">
          {/* Title */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-semibold text-black mb-4">
              Enter the OTP Code
            </h1>
            <p className="text-base text-gray-500">
              We will send an OTP code to your
              <br />
              email to reset your password.
            </p>
          </div>

          {/* Email Display */}
          <div className="mb-10 flex items-center justify-center gap-3 px-6 py-4 bg-white border border-gray-200 rounded-full text-base text-gray-900">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <span>{email}</span>
            <button className="text-gray-400 hover:text-gray-600">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </button>
          </div>

          {/* OTP Input Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            {/* OTP Boxes */}
            <div className="grid grid-cols-5 gap-3">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-full h-16 text-center text-2xl font-normal border-2 border-gray-300 focus:border-blue-500 focus:ring-0 outline-none transition"
                />
              ))}
            </div>

            {/* Login Button */}
            <Button type="submit" disabled={otp.some((digit) => !digit)}>
              Login
            </Button>

            {/* Resend Code */}
            <Button
              type="button"
              variant="secondary"
              onClick={handleResendCode}
            >
              Resend code
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function OTPPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center px-8 py-20">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    }>
      <OTPContent />
    </Suspense>
  );
}
