"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClubLogo } from "@/components/ClubLogo";
import { ShieldAlert, Mail } from "lucide-react";

export default function AccountDisabledPage() {
  const router = useRouter();

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
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                  <ShieldAlert className="w-10 h-10 text-red-600" />
                </div>
              </div>

              {/* Title */}
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Account Disabled
                </h1>
                <p className="text-gray-600">
                  Your account has been temporarily disabled
                </p>
              </div>

              {/* Message */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left">
                <p className="text-sm text-gray-700">
                  Your access to this app has been temporarily disabled by an administrator. Please contact your club admin for more information.
                </p>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-start gap-2">
                  <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p className="text-left">
                    To restore your access, please reach out to a club administrator who can reactivate your account.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4">
                <Button
                  onClick={() => router.push("/")}
                  variant="outline"
                  className="w-full"
                >
                  Back to Login
                </Button>
              </div>

              {/* Help text */}
              <p className="text-xs text-gray-500">
                If you believe this is an error, please contact your club administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
