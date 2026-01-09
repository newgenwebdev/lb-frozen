"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EditArticleRedirect(): null {
  const router = useRouter();

  useEffect(() => {
    // Redirect to articles list if no article ID is provided
    router.replace("/admin/article");
  }, [router]);

  return null;
}
