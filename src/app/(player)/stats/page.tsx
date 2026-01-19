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
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#1e3a5f]">Your Statistics</h2>
          <p className="text-muted-foreground">Track your attendance and payment history</p>
        </div>
        
        {/* Year Selector */}
        <Select
          value={selectedYear.toString()}
          onValueChange={(value) => setSelectedYear(parseInt(value))}
        >
          <SelectTrigger className="w-[100px]">
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
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="events" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Events
          </TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="mt-6">
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
