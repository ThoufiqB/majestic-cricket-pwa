"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/app/client/api";

type Props = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

/**
 * AdminGuard - Client-side admin role verification
 * 
 * Wraps admin pages to ensure only admins can access them.
 * Shows loading state while verifying, redirects non-admins to home.
 */
export function AdminGuard({ children, fallback }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "authorized" | "unauthorized">("loading");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function checkAdmin() {
      try {
        const me = await apiGet("/api/me");
        
        if (!me || !me.player_id) {
          setStatus("unauthorized");
          setError("Not authenticated");
          router.replace("/?error=auth_required");
          return;
        }

        const isAdmin = String(me.role || "").toLowerCase() === "admin";
        
        if (!isAdmin) {
          setStatus("unauthorized");
          setError("Admin access required");
          router.replace("/?error=admin_required");
          return;
        }

        setStatus("authorized");
      } catch (e: any) {
        setStatus("unauthorized");
        setError(e?.message || "Authentication failed");
        router.replace("/?error=auth_failed");
      }
    }

    checkAdmin();
  }, [router]);

  if (status === "loading") {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-600">Verifying access...</p>
          </div>
        </div>
      )
    );
  }

  if (status === "unauthorized") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-medium">Access Denied</p>
          <p className="mt-2 text-sm text-gray-600">{error}</p>
          <a href="/" className="mt-4 inline-block text-sm underline">
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
