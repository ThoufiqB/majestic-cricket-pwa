"use client";

import { useState, useEffect, useCallback } from "react";
import { apiGet } from "@/app/client/api";
import { useProfile } from "@/components/context/ProfileContext";

export type EventStatsSummary = {
  total_events: number;
  attended: number;
  missed: number;
  attendance_rate: number;
};

export type MonthlyEventStats = {
  month: string;
  total: number;
  attended: number;
  rate: number;
};

export type EventStatsData = {
  summary: EventStatsSummary;
  monthly: MonthlyEventStats[];
  available_years: number[];
  profile_id: string;
  year: number;
};

export type PaymentStatsSummary = {
  total_paid: number;
  total_pending: number;
  events_paid: number;
  events_pending: number;
};

export type MonthlyPaymentStats = {
  month: string;
  paid: number;
  pending: number;
};

export type EventPaymentBreakdown = {
  event_id: string;
  event_name: string;
  event_date: string;
  amount: number;
  paid_status: string;
};

export type PaymentStatsData = {
  summary: PaymentStatsSummary;
  monthly: MonthlyPaymentStats[];
  event_breakdown: EventPaymentBreakdown[];
  available_years: number[];
  profile_id: string;
  year: number;
};

export function useStats() {
  const { activeProfileId, playerId, loading: profileLoading } = useProfile();
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  
  // Event stats
  const [eventStats, setEventStats] = useState<EventStatsData | null>(null);
  const [eventStatsLoading, setEventStatsLoading] = useState(true);
  const [eventStatsError, setEventStatsError] = useState<string | null>(null);
  
  // Payment stats
  const [paymentStats, setPaymentStats] = useState<PaymentStatsData | null>(null);
  const [paymentStatsLoading, setPaymentStatsLoading] = useState(true);
  const [paymentStatsError, setPaymentStatsError] = useState<string | null>(null);

  const fetchEventStats = useCallback(async () => {
    if (profileLoading || !activeProfileId) return;
    
    setEventStatsLoading(true);
    setEventStatsError(null);
    
    try {
      // Only pass profile_id for kid profiles, not for player's own profile
      const isKid = activeProfileId !== playerId;
      const url = isKid 
        ? `/api/stats/events?profile_id=${activeProfileId}&year=${selectedYear}`
        : `/api/stats/events?year=${selectedYear}`;
      
      const data = await apiGet(url);
      setEventStats(data);
      
      // Update available years from response
      if (data.available_years?.length > 0) {
        setAvailableYears(data.available_years);
      }
    } catch (error: any) {
      console.error("Failed to fetch event stats:", error);
      setEventStatsError(error.message || "Failed to load event statistics");
    } finally {
      setEventStatsLoading(false);
    }
  }, [activeProfileId, playerId, selectedYear, profileLoading]);

  const fetchPaymentStats = useCallback(async () => {
    if (profileLoading || !activeProfileId) return;
    
    setPaymentStatsLoading(true);
    setPaymentStatsError(null);
    
    try {
      // Only pass profile_id for kid profiles, not for player's own profile
      const isKid = activeProfileId !== playerId;
      const url = isKid 
        ? `/api/stats/payments?profile_id=${activeProfileId}&year=${selectedYear}`
        : `/api/stats/payments?year=${selectedYear}`;
      
      const data = await apiGet(url);
      setPaymentStats(data);
    } catch (error: any) {
      console.error("Failed to fetch payment stats:", error);
      setPaymentStatsError(error.message || "Failed to load payment statistics");
    } finally {
      setPaymentStatsLoading(false);
    }
  }, [activeProfileId, selectedYear, profileLoading]);

  // Fetch data when profile or year changes
  useEffect(() => {
    fetchEventStats();
    fetchPaymentStats();
  }, [fetchEventStats, fetchPaymentStats]);

  // Initialize available years
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    setAvailableYears([currentYear, currentYear - 1, currentYear - 2]);
  }, []);

  return {
    // Event stats
    eventStats,
    eventStatsLoading,
    eventStatsError,
    refetchEventStats: fetchEventStats,
    
    // Payment stats
    paymentStats,
    paymentStatsLoading,
    paymentStatsError,
    refetchPaymentStats: fetchPaymentStats,
    
    // Year selection
    selectedYear,
    setSelectedYear,
    availableYears,
    
    // Profile info
    activeProfileId,
    isKidProfile: activeProfileId !== playerId,
  };
}
