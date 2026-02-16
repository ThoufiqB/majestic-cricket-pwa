"use client";

import { useCallback } from "react";
import { AdminGuard } from "@/components/guards/AdminGuard";
import { BadgeProvider } from "@/components/context/BadgeContext";
import { AppShell } from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const handleSignOut = useCallback(async () => {
    try {
      await fetch("/api/auth/sessionLogout", { method: "POST", credentials: "include" });
      window.location.href = "/";
    } catch {
      window.location.href = "/";
    }
  }, []);

  return (
    <AdminGuard
      fallback={
        <div className="min-h-screen p-6">
          <div className="max-w-md mx-auto space-y-4">
            {/* Header skeleton */}
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-16" />
            </div>
            
            {/* Tabs skeleton */}
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
            
            {/* Content skeleton */}
            <div className="space-y-3">
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          </div>
        </div>
      }
    >
      <BadgeProvider>
        <AppShell variant="admin" maxWidth="600px" onSignOut={handleSignOut}>
          {children}
        </AppShell>
      </BadgeProvider>
    </AdminGuard>
  );
}
