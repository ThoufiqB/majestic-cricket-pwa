"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp } from "lucide-react";
import { useStats } from "./useStats";
// ✅ Import EventStats explicitly so it is defined at runtime
import { EventStats } from "./components/EventStats";

export default function StatsPage() {
  const {
    eventStats,
    eventStatsLoading,
    eventStatsError,
    paymentStats,
    paymentStatsLoading,
    paymentStatsError,
    selectedYear,
    setSelectedYear,
    availableYears,
  } = useStats();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-row items-center justify-between gap-2 mb-2">
        <h2 className="text-2xl font-bold text-[#1e3a5f]">Statistics</h2>
        <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
          <SelectTrigger className="w-[90px] sm:w-[100px]">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="events" className="w-full">
        <TabsContent value="events">
          <div className="mb-4">
            <span className="inline-flex items-center rounded-full bg-primary text-primary-foreground px-4 py-1 text-sm font-semibold shadow-sm">
              Events
            </span>
          </div>
          <EventStats
            data={eventStats}
            loading={eventStatsLoading}
            error={eventStatsError}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
