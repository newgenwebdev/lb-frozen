"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginSchema, type LoginInput, LoginResponseSchema } from "@/lib/validators/auth";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { getSafeRedirectUrl } from "@/lib/utils/safe-redirect";

function LoginForm(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuth((state) => state.setAuth);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginInput): Promise<void> => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const response = await api.post("/auth/user/emailpass", data);
      const parsed = LoginResponseSchema.safeParse(response.data);

      if (!parsed.success) {
        throw new Error("Invalid response from server");
      }

      // Store token and create a basic user object
      // We'll fetch full user details later if needed
      const user = {
        id: data.email, // temporary
        email: data.email,
      };

      setAuth(user, parsed.data.token);

      // Validate redirect URL to prevent open redirect attacks
      const from = getSafeRedirectUrl(searchParams.get("from"), "/admin/overview");
      router.push(from);
    } catch (err) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Login failed. Please check your credentials.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <h1 className="font-inter text-[32px] font-semibold leading-[100%] tracking-[-0.64px] text-black">
            Welcome Back
          </h1>
          <p className="mt-2 font-inter text-[14px] font-normal leading-[140%] tracking-[-0.28px] text-[#666]">
            Sign in to your admin account
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 font-inter text-[14px] text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block font-inter text-[14px] font-medium leading-[140%] tracking-[-0.28px] text-black"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="johndoe@example.com"
              className="w-full rounded-lg border border-[#E3E3E3] bg-white px-4 py-[14px] font-inter text-[16px] font-normal leading-[100%] tracking-[-0.32px] text-black placeholder:text-[#999] outline-none transition-colors focus:border-black"
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p className="font-inter text-[12px] text-red-600">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block font-inter text-[14px] font-medium leading-[140%] tracking-[-0.28px] text-black"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                className="w-full rounded-lg border border-[#E3E3E3] bg-white px-4 py-[14px] pr-12 font-inter text-[16px] font-normal leading-[100%] tracking-[-0.32px] text-black placeholder:text-[#999] outline-none transition-colors focus:border-black"
                {...form.register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 font-inter text-[14px] text-[#666] transition-colors hover:text-black"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {form.formState.errors.password && (
              <p className="font-inter text-[12px] text-red-600">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-black px-4 py-[14px] font-inter text-[16px] font-semibold leading-[100%] tracking-[-0.32px] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage(): React.JSX.Element {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="font-inter text-[16px] text-[#666]">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
