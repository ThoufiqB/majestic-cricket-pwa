"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Wallet,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Filter,
  ArrowUpDown,
  Calendar,
  User,
} from "lucide-react";
import { PaymentSummary } from "../types";
import { apiGet } from "@/app/client/api";

type Props = {
  me: any;
  events: any[];
  activeProfileId: string;
};

export function PaymentDashboard({ me, events, activeProfileId }: Props) {
  const [paymentData, setPaymentData] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<
    "all" | "paid" | "pending" | "unpaid" | "rejected"
  >("all");
  const [profileFilter, setProfileFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "status">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Build list of profiles
  const profiles = useMemo(() => {
    if (!me) return [];
    const playerName = me.name || "You";
    const items = [{ profile_id: me.player_id, profile_name: playerName }];
    if (me.kids_profiles && Array.isArray(me.kids_profiles)) {
      me.kids_profiles.forEach((kid: any) => {
        items.push({ profile_id: kid.kid_id, profile_name: kid.name });
      });
    }
    return items;
  }, [me]);

  // Fetch payment data
  useEffect(() => {
    async function loadPayments() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (profileFilter !== "all") params.append("profile", profileFilter);
        if (statusFilter !== "all") params.append("status", statusFilter);
        params.append("sort", sortBy);
        params.append("order", sortOrder);

        const data = await apiGet(`/api/payments/summary?${params.toString()}`);
        setPaymentData(data);
      } catch (err) {
        console.error("Failed to load payments:", err);
        setError("Failed to load payment data");
      } finally {
        setLoading(false);
      }
    }

    loadPayments();
  }, [profileFilter, statusFilter, sortBy, sortOrder]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!paymentData) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          No payment data available
        </CardContent>
      </Card>
    );
  }

  const { summary, payments } = paymentData;
  const totalOwed = summary.total_pending + summary.total_unpaid + summary.total_rejected;

  return (
    <div className="space-y-4">
      {/* Outstanding Balance Summary Card */}
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 dark:from-blue-950 dark:to-blue-900 dark:border-blue-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <Wallet className="h-6 w-6" />
            Outstanding Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-white/80 dark:bg-gray-900/80">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground font-medium">Total Owed</p>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  £{totalOwed.toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white/80 dark:bg-gray-900/80">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground font-medium">Paid</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                  £{summary.total_paid.toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white/80 dark:bg-gray-900/80">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground font-medium">Pending</p>
                <div className="flex items-center gap-2">
                  <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                    £{summary.total_pending.toFixed(2)}
                  </p>
                  <Badge variant="secondary" className="text-xs">
                    {summary.count_pending}
                  </Badge>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/80 dark:bg-gray-900/80">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground font-medium">Unpaid</p>
                <div className="flex items-center gap-2">
                  <p className="text-xl font-bold text-red-600 dark:text-red-400">
                    £{summary.total_unpaid.toFixed(2)}
                  </p>
                  <Badge variant="secondary" className="text-xs">
                    {summary.count_unpaid}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Filter Controls */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="paid">✅ Paid</SelectItem>
                  <SelectItem value="pending">⏳ Pending</SelectItem>
                  <SelectItem value="unpaid">❌ Unpaid</SelectItem>
                  <SelectItem value="rejected">✗ Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Profile</label>
              <Select value={profileFilter} onValueChange={setProfileFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Profiles</SelectItem>
                  {profiles.map((p) => (
                    <SelectItem key={p.profile_id} value={p.profile_id}>
                      {p.profile_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Sort By</label>
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="amount">Amount</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Order</label>
              <Select value={sortOrder} onValueChange={(v: any) => setSortOrder(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Newest First</SelectItem>
                  <SelectItem value="asc">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4" />
            Payment History
          </CardTitle>
          <CardDescription>{payments.length} payment(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">
              No payments found matching your filters
            </p>
          ) : (
            <div className="space-y-3">
              {payments.map((payment, idx) => {
                const StatusIcon =
                  payment.status === "paid"
                    ? CheckCircle
                    : payment.status === "pending"
                    ? Clock
                    : payment.status === "unpaid"
                    ? XCircle
                    : AlertCircle;

                const statusVariant: "default" | "secondary" | "destructive" | "outline" =
                  payment.status === "paid"
                    ? "default"
                    : payment.status === "pending"
                    ? "secondary"
                    : payment.status === "unpaid"
                    ? "destructive"
                    : "outline";

                const bgClass =
                  payment.status === "paid"
                    ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800"
                    : payment.status === "pending"
                    ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800"
                    : payment.status === "unpaid"
                    ? "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
                    : "";

                const eventDate = new Date(payment.event_date || 0);
                const dateStr = eventDate.toLocaleDateString("en-US", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                });

                return (
                  <Card key={idx} className={bgClass}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold flex-1 truncate pr-2">
                          {payment.event_name}
                        </h4>
                        <Badge variant={statusVariant} className="gap-1 shrink-0">
                          <StatusIcon className="h-3 w-3" />
                          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <User className="h-3 w-3" />
                          {payment.profile_name}
                        </div>
                        <div className="font-semibold">£{payment.amount.toFixed(2)}</div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {dateStr}
                        </div>
                        {payment.confirmed_at && (
                          <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                            <CheckCircle className="h-3 w-3" />
                            Confirmed{" "}
                            {new Date(payment.confirmed_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
