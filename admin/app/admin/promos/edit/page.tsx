"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EditPromoRedirect(): null {
  const router = useRouter();

  useEffect(() => {
    // Redirect to promos list if no promo ID is provided
    router.replace("/admin/promos");
  }, [router]);

  return null;
}
