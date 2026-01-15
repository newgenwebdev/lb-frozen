"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Button from "@/components/shared/Button";
import { useLoginForm } from "@/lib/forms";
import { useLoginMutation } from "@/lib/queries";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // React Hook Form
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useLoginForm();

  // React Query mutation
  const loginMutation = useLoginMutation();

  const onSubmit = async (data: { email: string; password: string }) => {
    try {
      await loginMutation.mutateAsync(data);
      router.push("/");
    } catch (err: any) {
      console.error("Login failed:", err);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side - Login Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center px-8 py-12 bg-white">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-16 flex justify-center">
            <Image
              src="/lb-logo.png"
              alt="LB Frozen Logo"
              width={120}
              height={120}
              priority
            />
          </div>

          {/* Welcome Text */}
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-semibold text-black mb-3">
              Welcome back!
            </h1>
            <p className="text-gray-500">
              Log in now and buy the items you have saved in your cart.
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Error Message */}
            {loginMutation.error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {(loginMutation.error as Error).message || "Invalid email or password"}
              </div>
            )}

            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-base font-normal text-black mb-2"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                {...register("email")}
                placeholder="Enter your email"
                className={`w-full px-4 py-3.5 border ${
                  errors.email ? "border-red-500" : "border-gray-200"
                } focus:ring-2 focus:ring-pink-400 focus:border-transparent outline-none transition bg-gray-50 text-gray-500 placeholder:text-gray-400`}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-base font-normal text-black mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  {...register("password")}
                  placeholder="Enter your password"
                  className={`w-full px-4 py-3.5 border ${
                    errors.password ? "border-red-500" : "border-gray-200"
                  } focus:ring-2 focus:ring-pink-400 focus:border-transparent outline-none transition pr-12 bg-gray-50 text-gray-500 placeholder:text-gray-400`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  ) : (
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
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-5 h-5 text-pink-500 border-gray-300 rounded focus:ring-pink-500 cursor-pointer"
                />
                <span className="ml-2 text-sm text-gray-600">Remember me</span>
              </label>
              <a
                href="/reset-password"
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Forgot password?
              </a>
            </div>

            {/* Login Button */}
            <Button type="submit" disabled={!isValid || loginMutation.isPending}>
              {loginMutation.isPending ? "Logging in..." : "Login"}
            </Button>
          </form>
        </div>
      </div>

      {/* Right side - Seafood Images */}
      <div className="hidden lg:block lg:w-1/2 bg-gray-50 relative overflow-hidden">
        <div className="grid grid-cols-2 gap-4 p-8 h-full">
          <div className="relative h-48 bg-white rounded-2xl shadow-md overflow-hidden">
            <Image
              src="/crab.png"
              alt="Fresh Crab"
              fill
              className="object-cover"
            />
          </div>
          <div className="relative h-48 bg-white rounded-2xl shadow-md overflow-hidden mt-12">
            <Image
              src="/fish.png"
              alt="Fresh Fish"
              fill
              className="object-cover"
            />
          </div>
          <div className="relative h-48 bg-white rounded-2xl shadow-md overflow-hidden">
            <Image
              src="/lobster.png"
              alt="Fresh Lobster"
              fill
              className="object-cover"
            />
          </div>
          <div className="relative h-48 bg-white rounded-2xl shadow-md overflow-hidden mt-12">
            <Image
              src="/shrimp.png"
              alt="Fresh Shrimp"
              fill
              className="object-cover"
            />
          </div>
          <div className="relative h-48 bg-white rounded-2xl shadow-md overflow-hidden">
            <Image
              src="/salmon&fish.png"
              alt="Salmon & Fish"
              fill
              className="object-cover"
            />
          </div>
          <div className="relative h-48 bg-white rounded-2xl shadow-md overflow-hidden mt-12">
            <Image
              src="/octopus.png"
              alt="Fresh Octopus"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
