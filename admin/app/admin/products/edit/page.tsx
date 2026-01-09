"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EditProductRedirect(): null {
  const router = useRouter();

  useEffect(() => {
    // Redirect to products list if no product ID is provided
    router.replace("/admin/products");
  }, [router]);

  return null;
}
