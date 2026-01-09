"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EditMembershipTierRedirect(): null {
  const router = useRouter();

  useEffect(() => {
    // Redirect to membership tiers list if no tier ID is provided
    router.replace("/admin/membership/tiers");
  }, [router]);

  return null;
}
