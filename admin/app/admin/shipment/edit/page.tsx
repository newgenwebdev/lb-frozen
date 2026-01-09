"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EditShipmentRedirect(): null {
  const router = useRouter();

  useEffect(() => {
    // Redirect to shipment list if no shipment ID is provided
    router.replace("/admin/shipment");
  }, [router]);

  return null;
}
