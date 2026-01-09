"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EditBannerRedirect(): null {
  const router = useRouter();

  useEffect(() => {
    // Redirect to banners list if no banner ID is provided
    router.replace("/admin/banner");
  }, [router]);

  return null;
}
