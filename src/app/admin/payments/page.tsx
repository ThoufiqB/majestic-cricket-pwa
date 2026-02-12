"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  CreditCard, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Search,
  Users,
  Baby,
  Calendar,
  Check,
  X,
  Loader2,
  PoundSterling,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface PaymentItem {
  id: string;
  event_id: string;
  event_name: string;
  event_date: string | null;
  event_type: "adults" | "kids";
  profile_id: string;
  profile_name: string;
  parent_id?: string;
  parent_name?: string;
  amount: number;
  status: "paid" | "pending" | "unpaid" | "rejected";
  marked_at: string | null;
  confirmed_at: string | null;
  confirmed_by?: string;
}

interface PaymentStats {
  total: number;
  pending: number;
  paid: number;
  unpaid: number;
  rejected: number;
  totalAmount: number;
  pendingAmount: number;
  paidAmount: number;
}

type StatusFilter = "all" | "pending" | "paid" | "unpaid" | "rejected";
type TypeFilter = "all" | "adults" | "kids";

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Selected payments for bulk action
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: "paid" | "rejected";
    payments: PaymentItem[];
  }>({ open: false, action: "paid", payments: [] });

  // Generate month options: next month, current month, and previous 3 months
  const monthOptions = (() => {
    const options = [];
    const now = new Date();
    // Next month
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    options.push({
      value: `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`,
      label: nextMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    });
    // Current month and previous 3 months
    for (let i = 0; i < 4; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      options.push({
        value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
        label: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      });
    }
    return options;
  })();

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (monthFilter && monthFilter !== "all") params.set("month", monthFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/admin/payments/list?${params}`);
      if (!res.ok) throw new Error("Failed to fetch payments");

      const data = await res.json();
      setPayments(data.payments || []);
      setStats(data.stats || null);
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast.error("Failed to load payments");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, monthFilter, search]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleStatusChange = (status: StatusFilter) => {
    setStatusFilter(status);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (selectedIds.size === payments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(payments.map((p) => p.id)));
    }
  };

  const openConfirmDialog = (action: "paid" | "rejected", payment?: PaymentItem) => {
    const selected = payment
      ? [payment]
      : payments.filter((p) => selectedIds.has(p.id));

    if (selected.length === 0) {
      toast.error("No payments selected");
      return;
    }

    setConfirmDialog({ open: true, action, payments: selected });
  };

  const handleUpdateStatus = async () => {
    if (confirmDialog.payments.length === 0) return;

    setUpdating(true);
    try {
      const res = await fetch("/api/admin/payments/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payments: confirmDialog.payments.map((p) => ({
            eventId: p.event_id,
            profileId: p.profile_id,
            eventType: p.event_type,
          })),
          status: confirmDialog.action,
        }),
      });

      if (!res.ok) throw new Error("Failed to update payments");

      const data = await res.json();
      toast.success(`${data.updated} payment(s) marked as ${confirmDialog.action}`);

      setConfirmDialog({ open: false, action: "paid", payments: [] });
      fetchPayments();
    } catch (error) {
      console.error("Error updating payments:", error);
      toast.error("Failed to update payments");
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return `£${amount.toFixed(2)}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            Paid
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
            Pending
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">Unpaid</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-amber-600">
                  {stats?.pending || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(stats?.pendingAmount || 0)} awaiting
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">
                  {stats?.paid || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(stats?.paidAmount || 0)} collected
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unpaid</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.unpaid || 0}</div>
                <p className="text-xs text-muted-foreground">Not yet marked</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-red-600">
                  {stats?.rejected || 0}
                </div>
                <p className="text-xs text-muted-foreground">Payment issues</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            {/* Status Tabs */}
            <Tabs
              value={statusFilter}
              onValueChange={(v) => handleStatusChange(v as StatusFilter)}
            >
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="paid" className="gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Paid</span>
                </TabsTrigger>
                <TabsTrigger value="pending" className="gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="hidden sm:inline">Pending</span>
                </TabsTrigger>
                <TabsTrigger value="unpaid" className="gap-2">
                  <PoundSterling className="h-4 w-4" />
                  <span className="hidden sm:inline">Unpaid</span>
                </TabsTrigger>
                <TabsTrigger value="all" className="gap-2">
                  <CreditCard className="h-4 w-4" />
                  <span className="hidden sm:inline">All</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Search and Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or event..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select
                value={typeFilter}
                onValueChange={(v) => setTypeFilter(v as TypeFilter)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="adults">Adults</SelectItem>
                  <SelectItem value="kids">Juniors</SelectItem>
                </SelectContent>
              </Select>

              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {monthOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <Card className="border-primary">
          <CardContent className="py-3">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium">
                {selectedIds.size} payment(s) selected
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Clear
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => openConfirmDialog("rejected")}
                >
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  onClick={() => openConfirmDialog("paid")}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Confirm Paid
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payments List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {statusFilter === "all"
                ? "All Payments"
                : `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Payments`}
            </CardTitle>
            {payments.length > 0 && statusFilter === "pending" && (
              <Button variant="ghost" size="sm" onClick={selectAll}>
                {selectedIds.size === payments.length ? "Deselect All" : "Select All"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-3 border rounded-lg"
                >
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No payments found</p>
              <p className="text-sm text-muted-foreground">
                {statusFilter !== "all"
                  ? `No ${statusFilter} payments match your filters`
                  : "Try adjusting your filters"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {payments.map((payment) => {
                const showCheckbox = payment.status === "pending";
                return (
                  <div
                    key={payment.id}
                    className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                      showCheckbox ? "cursor-pointer" : ""
                    } ${
                      selectedIds.has(payment.id)
                        ? "border-primary bg-primary/5"
                        : showCheckbox
                        ? "hover:bg-muted/50"
                        : ""
                    }`}
                    onClick={() => showCheckbox && toggleSelect(payment.id)}
                  >
                    {/* Selection Checkbox - Only for pending */}
                    {showCheckbox && (
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          selectedIds.has(payment.id)
                            ? "border-primary bg-primary"
                            : "border-muted-foreground/30"
                        }`}
                      >
                        {selectedIds.has(payment.id) && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                    )}

                    {/* Type Icon */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        payment.event_type === "kids"
                          ? "bg-pink-100 dark:bg-pink-900/30"
                          : "bg-blue-100 dark:bg-blue-900/30"
                      }`}
                    >
                      {payment.event_type === "kids" ? (
                        <Baby className="h-5 w-5 text-pink-600" />
                      ) : (
                        <Users className="h-5 w-5 text-blue-600" />
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {payment.profile_name}
                        </span>
                        {payment.parent_name && (
                          <span className="text-xs text-muted-foreground truncate">
                            (Parent: {payment.parent_name})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span className="truncate">{payment.event_name}</span>
                        <span>•</span>
                        <span>{formatDate(payment.event_date)}</span>
                      </div>
                    </div>

                    {/* Amount & Status */}
                    <div className="text-right space-y-1">
                      <div className="font-semibold">
                        {formatCurrency(payment.amount)}
                      </div>
                      {getStatusBadge(payment.status)}
                    </div>

                    {/* Quick Actions */}
                    {(payment.status === "pending" ||
                      payment.status === "unpaid") && (
                      <div
                        className="flex gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                          onClick={() => openConfirmDialog("paid", payment)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100"
                          onClick={() =>
                            openConfirmDialog("rejected", payment)
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          !updating && setConfirmDialog({ ...confirmDialog, open })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.action === "paid"
                ? "Confirm Payment"
                : "Reject Payment"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-muted-foreground">
              {confirmDialog.action === "paid"
                ? `Are you sure you want to mark ${confirmDialog.payments.length} payment(s) as confirmed?`
                : `Are you sure you want to reject ${confirmDialog.payments.length} payment(s)?`}
            </p>

            {confirmDialog.payments.length <= 5 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {confirmDialog.payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between text-sm p-2 bg-muted rounded"
                  >
                    <span>{p.profile_name}</span>
                    <span className="text-muted-foreground">
                      {formatCurrency(p.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center text-sm font-medium pt-2 border-t">
              <span>Total</span>
              <span>
                {formatCurrency(
                  confirmDialog.payments.reduce(
                    (sum, p) => sum + p.amount,
                    0
                  )
                )}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setConfirmDialog({ ...confirmDialog, open: false })
              }
              disabled={updating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateStatus}
              disabled={updating}
              className={
                confirmDialog.action === "paid"
                  ? "bg-green-600 hover:bg-green-700"
                  : ""
              }
              variant={
                confirmDialog.action === "rejected"
                  ? "destructive"
                  : "default"
              }
            >
              {updating && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {confirmDialog.action === "paid"
                ? "Confirm Paid"
                : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
