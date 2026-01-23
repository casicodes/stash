"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useEffect, useMemo } from "react";
import { logout as logoutApi } from "@/lib/api/bookmarks";
import { createClient } from "@/lib/supabase/client";

export function useAuth() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function fetchUserEmail() {
      if (!supabase) return;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    }

    fetchUserEmail();
  }, [supabase]);

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
    userEmail,
  };
}
