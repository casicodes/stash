"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { logout as logoutApi } from "@/lib/api/bookmarks";

export function useAuth() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      const { success, error } = await logoutApi();
      if (success) {
        router.push("/auth/sign-in");
      } else {
        console.error("Logout failed:", error);
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
    }
  }, [router]);

  return {
    logout,
    isLoggingOut,
  };
}
