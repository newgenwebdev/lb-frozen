"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EditUserRedirect(): null {
  const router = useRouter();

  useEffect(() => {
    // Redirect to users list if no user ID is provided
    router.replace("/admin/users-roles");
  }, [router]);

  return null;
}
