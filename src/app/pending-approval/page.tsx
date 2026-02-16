"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClubLogo } from "@/components/ClubLogo";
import { Clock, Mail } from "lucide-react";

export default function PendingApprovalPage() {
  const router = useRouter();

  useEffect(() => {
    // Check auth status periodically (every 30 seconds)
    // In case admin approves while user is waiting
    const interval = setInterval(async () => {
      try {
        const response = await fetch("/api/me", {
          credentials: "include",
        });
        
        if (response.ok) {
          // User has been approved! Redirect to home
          router.replace("/home");
        }
      } catch {
        // Still not approved, keep waiting
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <ClubLogo />
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-6">
              {/* Icon */}
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Clock className="w-10 h-10 text-yellow-600" />
                </div>
              </div>

              {/* Title */}
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Pending Approval
                </h1>
                <p className="text-gray-600">
                  Your access request has been submitted
                </p>
              </div>

              {/* Message */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
                <p className="text-sm text-gray-700">
                  An administrator will review your request shortly. You'll be able to access the app once your account is approved.
                </p>
              </div>

              {/* Instructions */}
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-start gap-2">
                  <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p className="text-left">
                    You may receive an email notification once your account is approved.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3 pt-4">
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="w-full"
                >
                  Check Status
                </Button>

                <Button
                  onClick={() => router.push("/")}
                  variant="ghost"
                  className="w-full"
                >
                  Back to Login
                </Button>
              </div>

              {/* Help text */}
              <p className="text-xs text-gray-500">
                Need help? Contact an administrator at your club.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
