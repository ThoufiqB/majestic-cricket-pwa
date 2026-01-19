"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { TrendingUp, TrendingDown, Calendar, CheckCircle, XCircle } from "lucide-react";
import type { EventStatsData, MonthlyEventStats } from "../useStats";

type Props = {
  data: EventStatsData | null;
  loading: boolean;
  error: string | null;
};

const COLORS = {
  attended: "#22c55e", // green-500
  missed: "#ef4444",   // red-500
};

function getMonthName(monthStr: string): string {
  const [, month] = monthStr.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return months[parseInt(month) - 1] || month;
}

export function EventStats({ data, loading, error }: Props) {
  if (loading) {
    return <EventStatsSkeleton />;
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

  const { summary, monthly } = data;
  
  // Prepare donut chart data
  const donutData = [
    { name: "Attended", value: summary.attended, color: COLORS.attended },
    { name: "Missed", value: summary.missed, color: COLORS.missed },
  ].filter(item => item.value > 0);

  // If no events, show empty state
  if (summary.total_events === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mb-4 opacity-50" />
            <p>No events found for this year</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter months with events for the bar display
  const monthsWithEvents = monthly.filter(m => m.total > 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-bold text-[#1e3a5f]">{summary.total_events}</div>
            <div className="text-xs text-muted-foreground">Total Events</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-bold text-green-600">{summary.attended}</div>
            <div className="text-xs text-muted-foreground">Attended</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-bold text-[#1e3a5f]">{summary.attendance_rate}%</div>
            <div className="text-xs text-muted-foreground">Rate</div>
          </CardContent>
        </Card>
      </div>

      {/* Donut Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Attendance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={false}
                >
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name) => [`${value} events`, name]}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  wrapperStyle={{ paddingTop: "10px" }}
                  formatter={(value: string) => (
                    <span className="text-xs text-muted-foreground">{value}</span>
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
          {monthsWithEvents.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No events in selected period</p>
          ) : (
            <div className="space-y-3">
              {monthsWithEvents.map((month) => (
                <MonthlyRow key={month.month} data={month} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MonthlyRow({ data }: { data: MonthlyEventStats }) {
  const percentage = data.rate;
  const isPerfect = percentage === 100;
  const isLow = percentage < 50;

  return (
    <div className="flex items-center gap-3">
      <div className="w-10 text-sm font-medium text-muted-foreground">
        {getMonthName(data.month)}
      </div>
      <div className="flex-1">
        <div className="h-6 bg-gray-100 rounded-full overflow-hidden relative">
          <div 
            className="h-full rounded-full transition-all duration-500"
            style={{ 
              width: `${percentage}%`,
              backgroundColor: isLow ? COLORS.missed : COLORS.attended,
            }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
            {data.attended}/{data.total}
          </span>
        </div>
      </div>
      <div className="w-12 text-right">
        <span className={`text-sm font-medium ${
          isPerfect ? "text-green-600" : isLow ? "text-red-600" : "text-muted-foreground"
        }`}>
          {percentage}%
        </span>
      </div>
      {isPerfect && <span className="text-yellow-500">🏆</span>}
    </div>
  );
}

function EventStatsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Summary Cards Skeleton */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="pt-4 pb-4 text-center">
              <Skeleton className="h-8 w-12 mx-auto mb-2" />
              <Skeleton className="h-3 w-16 mx-auto" />
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
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
