"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { CreditCard, CheckCircle, Clock, AlertCircle } from "lucide-react";
import type { PaymentStatsData, MonthlyPaymentStats, EventPaymentBreakdown } from "../useStats";

type Props = {
  data: PaymentStatsData | null;
  loading: boolean;
  error: string | null;
};

const COLORS = {
  paid: "#22c55e",    // green-500
  pending: "#f59e0b", // amber-500
};

function formatCurrency(amount: number): string {
  return `£${amount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getMonthName(monthStr: string): string {
  const [, month] = monthStr.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return months[parseInt(month) - 1] || month;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function PaymentStats({ data, loading, error }: Props) {
  if (loading) {
    return <PaymentStatsSkeleton />;
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <p className="text-red-600 text-center">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">No data available</p>
        </CardContent>
      </Card>
    );
  }

  const { summary, monthly, event_breakdown } = data;
  
  // Prepare donut chart data
  const donutData = [
    { name: "Paid", value: summary.total_paid, color: COLORS.paid },
    { name: "Pending", value: summary.total_pending, color: COLORS.pending },
  ].filter(item => item.value > 0);

  const totalAmount = summary.total_paid + summary.total_pending;

  // If no payment data
  if (totalAmount === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <CreditCard className="h-12 w-12 mb-4 opacity-50" />
            <p>No payment records found for this year</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter months with payments
  const monthsWithPayments = monthly.filter(m => m.paid > 0 || m.pending > 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Total Paid</span>
            </div>
            <div className="text-xl font-bold text-green-600">{formatCurrency(summary.total_paid)}</div>
            <div className="text-xs text-muted-foreground">{summary.events_paid} events</div>
          </CardContent>
        </Card>
        <Card className={summary.total_pending > 0 ? "border-amber-200 bg-amber-50" : ""}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="text-xs text-muted-foreground">Pending</span>
            </div>
            <div className="text-xl font-bold text-amber-600">{formatCurrency(summary.total_pending)}</div>
            <div className="text-xs text-muted-foreground">{summary.events_pending} events</div>
          </CardContent>
        </Card>
      </div>

      {/* Donut Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Payment Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name) => [formatCurrency(Number(value)), String(name)]}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value: string) => (
                    <span className="text-sm text-muted-foreground">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Monthly Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {monthsWithPayments.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No payments in selected period</p>
          ) : (
            <div className="space-y-3">
              {monthsWithPayments.map((month) => (
                <MonthlyRow key={month.month} data={month} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      {event_breakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {event_breakdown.slice(0, 10).map((event) => (
                <EventRow key={event.event_id} data={event} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MonthlyRow({ data }: { data: MonthlyPaymentStats }) {
  const total = data.paid + data.pending;
  const paidPercent = total > 0 ? (data.paid / total) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <div className="w-10 text-sm font-medium text-muted-foreground">
        {getMonthName(data.month)}
      </div>
      <div className="flex-1">
        <div className="h-6 bg-gray-100 rounded-full overflow-hidden flex">
          {data.paid > 0 && (
            <div 
              className="h-full bg-green-500 flex items-center justify-center"
              style={{ width: `${paidPercent}%` }}
            >
              {paidPercent > 30 && (
                <span className="text-[10px] text-white font-medium">{formatCurrency(data.paid)}</span>
              )}
            </div>
          )}
          {data.pending > 0 && (
            <div 
              className="h-full bg-amber-500 flex items-center justify-center"
              style={{ width: `${100 - paidPercent}%` }}
            >
              {(100 - paidPercent) > 30 && (
                <span className="text-[10px] text-white font-medium">{formatCurrency(data.pending)}</span>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="w-20 text-right">
        <span className="text-sm font-medium text-muted-foreground">
          {formatCurrency(total)}
        </span>
      </div>
    </div>
  );
}

function EventRow({ data }: { data: EventPaymentBreakdown }) {
  const statusConfig = {
    PAID: { label: "Paid", variant: "default" as const, className: "bg-green-600" },
    CONFIRMED: { label: "Paid", variant: "default" as const, className: "bg-green-600" },
    PENDING: { label: "Pending", variant: "secondary" as const, className: "bg-amber-100 text-amber-700" },
    REJECTED: { label: "Rejected", variant: "destructive" as const, className: "" },
    NOT_PAID: { label: "Not Paid", variant: "outline" as const, className: "" },
  };

  const status = statusConfig[data.paid_status as keyof typeof statusConfig] || statusConfig.NOT_PAID;

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{data.event_name}</div>
        <div className="text-xs text-muted-foreground">{formatDate(data.event_date)}</div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{formatCurrency(data.amount)}</span>
        <Badge variant={status.variant} className={status.className}>
          {status.label}
        </Badge>
      </div>
    </div>
  );
}

function PaymentStatsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Summary Cards Skeleton */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="pt-4 pb-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-6 w-24 mb-1" />
              <Skeleton className="h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart Skeleton */}
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full rounded-lg" />
        </CardContent>
      </Card>

      {/* Monthly Skeleton */}
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-6 flex-1 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
