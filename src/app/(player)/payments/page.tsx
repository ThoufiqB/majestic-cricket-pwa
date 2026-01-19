"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  CreditCard, 
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2
} from "lucide-react";
import { apiGet, apiPost } from "@/app/client/api";
import { toast } from "sonner";
import { useProfile } from "@/components/context/ProfileContext";

interface Payment {
  event_id: string;
  event_title: string;
  amount: number;
  status: "paid" | "pending" | "unpaid" | "rejected";
  attended: boolean;
  profile_id: string;
  profile_type: "player" | "kid";
  date: string;
}

interface PaymentSummary {
  totalPaid: number;
  totalPending: number;
  totalUnpaid: number;
  recentPayments: Payment[];
}

export default function PaymentsPage() {
  const { activeProfileId, playerId, isKidProfile, loading: profileLoading } = useProfile();
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    if (profileLoading || !activeProfileId) return;
    
    try {
      // Always pass the active profile to get payments for that specific profile only
      const data = await apiGet(`/api/payments/summary?profile=${activeProfileId}`);
      // Transform API response to match expected format
      setSummary({
        totalPaid: data.summary?.total_paid || 0,
        totalPending: data.summary?.total_pending || 0,
        totalUnpaid: data.summary?.total_unpaid || 0,
        recentPayments: (data.payments || []).slice(0, 5).map((p: any) => ({
          event_id: p.event_id,
          event_title: p.event_name || "Unknown Event",
          amount: p.amount || 0,
          status: p.status || "unpaid",
          attended: !!p.attended,
          profile_id: p.profile_id,
          profile_type: p.profile_type || "player",
          date: p.event_date ? new Date(p.event_date).toLocaleDateString("en-GB", { 
            day: "numeric", 
            month: "short", 
            year: "numeric" 
          }) : "",
        })),
      });
    } catch (e) {
      console.error("Failed to fetch payment summary:", e);
    } finally {
      setLoading(false);
    }
  }, [activeProfileId, profileLoading]);

  useEffect(() => {
    setLoading(true);
    fetchPayments();
  }, [fetchPayments]);

  const handleMarkPaid = async (payment: Payment) => {
    setMarkingPaid(payment.event_id);
    try {
      // Use different API endpoint based on profile type
      if (payment.profile_type === "kid") {
        await apiPost(`/api/kids/${payment.profile_id}/paid`, {
          event_id: payment.event_id,
          paid_status: "PENDING",
        });
      } else {
        await apiPost(`/api/events/${payment.event_id}/paid`, {
          paid_status: "PENDING",
        });
      }
      toast.success("Payment marked! Waiting for admin confirmation.");
      // Refresh data
      await fetchPayments();
    } catch (error: any) {
      toast.error(error.message || "Failed to mark payment");
    } finally {
      setMarkingPaid(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="h-6 w-6" />
          My Payments
        </h1>
        <p className="text-sm text-muted-foreground">
          Track your event payments and membership fees
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <CheckCircle2 className="h-6 w-6 mx-auto text-green-600 mb-2" />
            <p className="text-2xl font-bold text-green-600">
              £{summary?.totalPaid?.toFixed(2) || "0.00"}
            </p>
            <p className="text-xs text-muted-foreground">Paid</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 text-center">
            <Clock className="h-6 w-6 mx-auto text-amber-500 mb-2" />
            <p className="text-2xl font-bold text-amber-500">
              £{summary?.totalPending?.toFixed(2) || "0.00"}
            </p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 text-center">
            <AlertCircle className="h-6 w-6 mx-auto text-red-500 mb-2" />
            <p className="text-2xl font-bold text-red-500">
              £{summary?.totalUnpaid?.toFixed(2) || "0.00"}
            </p>
            <p className="text-xs text-muted-foreground">Unpaid</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Your recent event payments</CardDescription>
        </CardHeader>
        <CardContent>
          {summary?.recentPayments && summary.recentPayments.length > 0 ? (
            <div className="space-y-3">
              {summary.recentPayments.slice(0, 5).map((payment, i) => {
                // Allow marking paid for unpaid OR rejected status (if attended)
                const canMarkPaid = (payment.status === "unpaid" || payment.status === "rejected") && payment.attended;
                const isMarking = markingPaid === payment.event_id;
                
                return (
                  <div key={i} className="flex items-center justify-between py-2 border-b last:border-0 gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{payment.event_title}</p>
                      <p className="text-xs text-muted-foreground">{payment.date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="font-semibold">£{payment.amount.toFixed(2)}</p>
                      </div>
                      {canMarkPaid ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs whitespace-nowrap"
                          disabled={isMarking}
                          onClick={() => handleMarkPaid(payment)}
                        >
                          {isMarking ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Mark Paid"
                          )}
                        </Button>
                      ) : (
                        <Badge 
                          variant={
                            payment.status === "paid" ? "default" : 
                            payment.status === "pending" ? "secondary" : "destructive"
                          }
                          className="text-xs"
                        >
                          {payment.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No payment history yet</p>
              <p className="text-sm">Sign up for events to see your payments here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
