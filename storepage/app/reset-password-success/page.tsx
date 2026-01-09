"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import Button from "@/components/shared/Button";
import Navbar from "@/components/layout/Navbar";

export default function ResetPasswordSuccessPage() {
  const router = useRouter();

  const handleLogin = () => {
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="flex items-center justify-center px-8 py-20">
        <div className="w-full max-w-md bg-white px-12 py-16 shadow-sm text-center">
          {/* Illustration */}
          <div className="mb-8 flex justify-center">
            <Image
              src="/illustration-1-resetpassword-success.png"
              alt="Success Illustration"
              width={250}
              height={250}
              priority
            />
          </div>

          {/* Title */}
          <h1 className="text-3xl font-semibold text-black mb-4">
            Successfully changed
          </h1>

          {/* Description */}
          <p className="text-base text-gray-500 mb-8">
            Now you can log in again with your
            <br />
            new password.
          </p>

          {/* Login Button */}
          <Button onClick={handleLogin}>Log in again</Button>
        </div>
      </div>
    </div>
  );
}
