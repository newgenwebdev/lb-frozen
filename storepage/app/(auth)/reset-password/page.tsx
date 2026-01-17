'use client';

import { useState, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Button from '@/components/shared/Button';
import { 
  resetPasswordSchema, 
  type ResetPasswordFormData,
  forgotPasswordSchema,
  type ForgotPasswordFormData
} from '@/lib/schemas';
import { useRequestPasswordResetMutation, useResetPasswordMutation } from '@/lib/queries';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mutations
  const requestResetMutation = useRequestPasswordResetMutation();
  const resetPasswordMutation = useResetPasswordMutation();

  // Request Reset Form
  const requestForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onChange',
  });

  // Confirm Reset Form
  const confirmForm = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onChange',
  });

  const password = confirmForm.watch('password', '');

  // Password validation states
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasMinLength = password.length >= 8;
  const hasNumber = /[0-9]/.test(password);

  const passwordStrength = [hasSymbol, hasUppercase, hasMinLength, hasNumber].filter(Boolean).length;

  const getStrengthLabel = () => {
    if (passwordStrength === 4) return 'Strong';
    if (passwordStrength >= 2) return 'Medium';
    return 'Weak';
  };

  const getStrengthColor = () => {
    if (passwordStrength === 4) return 'bg-green-500';
    if (passwordStrength >= 2) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const onRequestSubmit = async (data: ForgotPasswordFormData) => {
    setError(null);
    try {
      await requestResetMutation.mutateAsync(data.email);
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    }
  };

  const onConfirmSubmit = async (data: ResetPasswordFormData) => {
    if (!token) return;
    setError(null);
    try {
      await resetPasswordMutation.mutateAsync({
        token,
        password: data.password,
      });
      router.push('/reset-password-success');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
    }
  };

  // Render: Success State (Check Email)
  if (isSuccess && !token) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center px-8 py-20">
          <div className="w-full max-w-md bg-white px-12 py-16 shadow-sm text-center">
            <h1 className="text-2xl font-semibold text-black mb-3">Check your email</h1>
            <p className="text-gray-500 mb-8">
              We have sent a password reset link to your email address.
            </p>
            <Button onClick={() => router.push('/login')}>
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Render: Request Reset Form (No Token)
  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center px-8 py-20">
          <div className="w-full max-w-md bg-white px-12 py-16 shadow-sm">
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-semibold text-black mb-3">
                Forgot Password?
              </h1>
              <p className="text-sm text-gray-500">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            <form onSubmit={requestForm.handleSubmit(onRequestSubmit)} className="space-y-6">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md">
                  {error}
                </div>
              )}
              
              <div>
                <label htmlFor="email" className="block text-base font-normal text-black mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  {...requestForm.register('email')}
                  placeholder="Enter your email"
                  className="w-full px-4 py-3.5 border border-gray-200 focus:ring-2 focus:ring-pink-400 focus:border-transparent outline-none transition bg-gray-50 text-gray-700 placeholder:text-gray-400"
                />
                {requestForm.formState.errors.email && (
                  <p className="mt-2 text-xs text-red-500">
                    {requestForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <Button 
                type="submit"
                disabled={requestForm.formState.isSubmitting}
              >
                {requestForm.formState.isSubmitting ? 'Sending...' : 'Send Reset Link'}
              </Button>

              <div className="text-center mt-4">
                <a href="/login" className="text-sm text-gray-500 hover:text-black">
                  Back to Login
                </a>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Render: Confirm Reset Form (With Token)
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="flex items-center justify-center px-8 py-20">
        <div className="w-full max-w-md bg-white px-12 py-16 shadow-sm">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold text-black mb-3">
              Create new password
            </h1>
            <p className="text-sm text-gray-500">
              Create a strong password and don&apos;t<br />forget it again, okay?
            </p>
          </div>

          <form onSubmit={confirmForm.handleSubmit(onConfirmSubmit)} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md">
                {error}
              </div>
            )}

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-base font-normal text-black mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  {...confirmForm.register('password')}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3.5 border border-gray-200 focus:ring-2 focus:ring-pink-400 focus:border-transparent outline-none transition pr-12 bg-gray-50 text-gray-700 placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                  </svg>
                </button>
              </div>

              {confirmForm.formState.errors.password && (
                <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {confirmForm.formState.errors.password.message}
                </p>
              )}

              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-3">
                  <div className="flex gap-2 mb-2">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-2 flex-1 rounded-full ${
                          level <= passwordStrength ? getStrengthColor() : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-sm font-medium ${passwordStrength === 4 ? 'text-green-600' : 'text-gray-600'}`}>
                    {getStrengthLabel()}
                  </p>
                </div>
              )}

              {/* Password Requirements */}
              <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3">
                <div className="flex items-center gap-2">
                  <svg className={`w-5 h-5 ${hasSymbol ? 'text-green-500' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className={`text-sm ${hasSymbol ? 'text-gray-700' : 'text-gray-400'}`}>Contain 1 symbol</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className={`w-5 h-5 ${hasUppercase ? 'text-green-500' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className={`text-sm ${hasUppercase ? 'text-gray-700' : 'text-gray-400'}`}>Contain 1 Uppercase</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className={`w-5 h-5 ${hasMinLength ? 'text-green-500' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className={`text-sm ${hasMinLength ? 'text-gray-700' : 'text-gray-400'}`}>Minimal 8 character</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className={`w-5 h-5 ${hasNumber ? 'text-green-500' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className={`text-sm ${hasNumber ? 'text-gray-700' : 'text-gray-400'}`}>Using 1 number</span>
                </div>
              </div>
            </div>

            {/* Re-enter Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-base font-normal text-black mb-2">
                Re-enter
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  {...confirmForm.register('confirmPassword')}
                  placeholder="Re-enter your password"
                  className="w-full px-4 py-3.5 border border-gray-200 focus:ring-2 focus:ring-pink-400 focus:border-transparent outline-none transition pr-12 bg-gray-50 text-gray-700 placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                  </svg>
                </button>
              </div>
              {confirmForm.formState.errors.confirmPassword && (
                <p className="mt-2 text-xs text-red-500">{confirmForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Confirm Button */}
            <Button 
              type="submit"
              disabled={confirmForm.formState.isSubmitting || passwordStrength < 4}
            >
              {confirmForm.formState.isSubmitting ? 'Processing...' : 'Confirm'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
