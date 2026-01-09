"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const initAuth = useAuth((state) => state.initAuth);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return <>{children}</>;
}
