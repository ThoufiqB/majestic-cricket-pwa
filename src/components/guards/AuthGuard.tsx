"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/app/client/api";

type Props = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

/**
 * AuthGuard - Client-side authentication verification
 * 
 * Wraps pages that require authentication.
 * Shows loading state while verifying, redirects unauthenticated users.
 */
export function AuthGuard({ children, fallback }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "authorized" | "unauthorized">("loading");

  useEffect(() => {
    async function checkAuth() {
      try {
        const me = await apiGet("/api/me");
        
        if (!me || !me.player_id) {
          setStatus("unauthorized");
          router.replace("/?error=auth_required");
          return;
        }

        // Active users can access protected pages
        // Note: profile_completed check removed - only applies during registration flow
        // Active approved users may have incomplete profiles from legacy data
        setStatus("authorized");
      } catch (e: any) {
        setStatus("unauthorized");
        router.replace("/?error=auth_required");
      }
    }

    checkAuth();
  }, [router]);

  if (status === "loading") {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-600">Loading...</p>
          </div>
        </div>
      )
    );
  }

  if (status === "unauthorized") {
    return null; // Will redirect
  }

  return <>{children}</>;
}
