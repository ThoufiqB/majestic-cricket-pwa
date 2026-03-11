"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClubLogo } from "@/components/ClubLogo";
import { Clock, Mail, UserCheck } from "lucide-react";

function PendingApprovalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isParentPending = searchParams.get("stage") === "parent";
  const [checkCount, setCheckCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch("/api/me", { credentials: "include" });
        if (response.ok) {
          router.replace("/home");
        } else {
          setCheckCount(c => c + 1);
        }
      } catch {
        setCheckCount(c => c + 1);
      }
    }, 30000);
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
              <div className="flex justify-center">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                  isParentPending ? "bg-amber-100" : "bg-yellow-100"
                }`}>
                  {isParentPending
                    ? <UserCheck className="w-10 h-10 text-amber-600" />
                    : <Clock className="w-10 h-10 text-yellow-600" />}
                </div>
              </div>

              <div>
                {isParentPending ? (
                  <>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                      Waiting for Parent Approval
                    </h1>
                    <p className="text-gray-600">
                      Your registration is waiting for your parent/guardian to confirm they are your Profile Manager.
                    </p>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4 text-left">
                      <p className="text-sm text-gray-700">
                        Ask them to open the app, go to{" "}
                        <strong>Profile → Requests</strong> and tap{" "}
                        <strong>Approve</strong>.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                      Pending Admin Approval
                    </h1>
                    <p className="text-gray-600">
                      Your registration has been submitted and is being reviewed by an admin.
                    </p>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4 text-left">
                      <p className="text-sm text-gray-700">
                        You'll be redirected automatically once your account is approved.
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-start gap-2">
                  <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p className="text-left">
                    This page checks automatically every 30 seconds.
                    {checkCount > 0 && (
                      <span className="text-gray-400 ml-1">
                        (checked {checkCount} time{checkCount !== 1 ? "s" : ""})
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
                  Check Status
                </Button>
                <Button onClick={() => router.push("/")} variant="ghost" className="w-full">
                  Back to Login
                </Button>
              </div>

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

export default function PendingApprovalPage() {
  return (
    <Suspense>
      <PendingApprovalContent />
    </Suspense>
  );
}

