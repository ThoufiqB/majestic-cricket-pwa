"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../client/api";
import type { FriendsGoing, HomeEvent } from "./types";
import { buildMonthOptions, clampPct, isMembershipEvent, isProfileComplete, monthKeyFromDate } from "./helpers";
import { calculateAge, isAgeInRange, getAgeEligibilityMessage } from "@/lib/ageCalculator";

type Attending = "YES" | "NO" | "UNKNOWN";
type PaidStatus = "UNPAID" | "PENDING" | "PAID" | "REJECTED";

function normAttending(v: any): Attending {
  const s = String(v || "").toUpperCase();
  if (s === "YES" || s === "NO") return s;
  return "UNKNOWN";
}

function normPaid(v: any): PaidStatus {
  const s = String(v || "").toUpperCase();
  if (s === "PAID" || s === "PENDING" || s === "REJECTED") return s;
  return "UNPAID";
}

export function useHome(activeProfileId?: string) {
  const [me, setMe] = useState<any>(null);

  const [selectedMonth, setSelectedMonth] = useState<string>(monthKeyFromDate(new Date()));
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedGroup, setSelectedGroup] = useState<"men" | "women">("men");
  const [selectedType, setSelectedType] = useState<
    "all" | "net_practice" | "league_match" | "family_event" | "membership_fee"
  >("all");

  const [events, setEvents] = useState<HomeEvent[]>([]);
  const [msg, setMsg] = useState<string>("");

  const [needsProfile, setNeedsProfile] = useState(false);
  const [profileGroup, setProfileGroup] = useState<"" | "men" | "women">("");
  const [profileMemberType, setProfileMemberType] = useState<"" | "standard" | "student">("");
  const [profilePhone, setProfilePhone] = useState<string>("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [friendsCache, setFriendsCache] = useState<Record<string, FriendsGoing>>({});
  const [friendsOpenEventId, setFriendsOpenEventId] = useState<string | null>(null);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsErr, setFriendsErr] = useState<string>("");

  const monthOptions = useMemo(() => buildMonthOptions(7), []);
  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear();
    return [now - 1, now, now + 1, now + 2, now + 3];
  }, []);

  const isAdmin = me?.role === "admin";
  const isKidProfile = activeProfileId && activeProfileId !== me?.player_id;

  function normalizeEvents(list: any[]): HomeEvent[] {
    // Flatten the nested 'my' object to top-level fields for backward compatibility
    // API returns: { ...ev, my: { attending, paid_status, attended, fee_due } }
    // UI expects: { ...ev, my_attending, my_paid_status, my_attended, my_fee_due }
    return (list || []).map((ev: any) => {
      const myData = ev?.my || {};
      return {
        ...ev,
        my_attending: normAttending(myData?.attending ?? ev?.my_attending),
        my_paid_status: normPaid(myData?.paid_status ?? ev?.my_paid_status),
        my_attended: !!(myData?.attended ?? ev?.my_attended),
        my_fee_due: (myData?.fee_due === null || typeof myData?.fee_due === "undefined" || myData?.fee_due === "") 
          ? null 
          : (myData?.fee_due !== undefined ? Number(myData.fee_due) : (ev?.my_fee_due === null ? null : Number(ev?.my_fee_due))),
      };
    }) as HomeEvent[];
  }

  async function refreshList() {
    const wantsMembershipOnly = selectedType === "membership_fee";

    const q = new URLSearchParams();
    q.set("month", selectedMonth);
    
    if (isKidProfile) {
      // For kids: filter to all_kids group
      q.set("group", "all_kids");
    } else {
      // For adults: use selected type and group
      q.set("type", selectedType);
      if (wantsMembershipOnly) q.set("year", String(selectedYear));

      // for admin browse override (optional)
      if (isAdmin) q.set("group", selectedGroup);
    }

    const data = await apiGet(`/api/events?${q.toString()}`);

    const normalized = normalizeEvents(data.events || []);
    setEvents(normalized);

    if (data.group && (data.group === "men" || data.group === "women")) {
      setSelectedGroup(data.group);
    }
  }

  async function loadMeAndEvents() {
    setMsg("Loading…");
    const meData = await apiGet("/api/me");
    setMe(meData);

    if (!isProfileComplete(meData)) {
      setNeedsProfile(true);

      const g = String(meData?.group || "").trim().toLowerCase();
      const mt = String(meData?.member_type || "").trim().toLowerCase();
      const ph = String(meData?.phone || "").trim();

      setProfileGroup(g === "men" || g === "women" ? (g as any) : "");
      setProfileMemberType(mt === "standard" || mt === "student" ? (mt as any) : "");
      setProfilePhone(ph);

      setEvents([]);
      setMsg("");
      return;
    }

    setNeedsProfile(false);

    const g = String(meData?.group || "").trim().toLowerCase();
    if (g === "men" || g === "women") setSelectedGroup(g as any);

    await refreshList();
    setMsg("");
  }

  useEffect(() => {
    loadMeAndEvents().catch((e: any) => {
      setMe(null);
      setEvents([]);
      setNeedsProfile(false);
      setMsg(String(e?.message || e || ""));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!me) return;
    if (needsProfile) return;

    refreshList().catch((e: any) => setMsg(String(e?.message || e || "")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear, selectedType, selectedGroup, me, needsProfile, activeProfileId]);

  // Reload me object when activeProfileId changes (after profile switch)
  useEffect(() => {
    if (!activeProfileId || !me) return;
    // Reload me to get fresh active_profile_id from Firestore
    apiGet("/api/me")
      .then((meData) => {
        setMe(meData);
      })
      .catch((e: any) => {
        console.error("Failed to reload me:", e);
      });
  }, [activeProfileId]);

  async function saveProfile() {
    setMsg("");

    if (profileGroup !== "men" && profileGroup !== "women") return setMsg("Error: Please select your group.");
    if (profileMemberType !== "standard" && profileMemberType !== "student")
      return setMsg("Error: Please select member type.");

    setSavingProfile(true);
    try {
      const resp = await apiPost("/api/profile", {
        group: profileGroup,
        member_type: profileMemberType,
        phone: profilePhone.trim(),
      });

      const meUpdated = resp?.me || (await apiGet("/api/me"));
      setMe(meUpdated);

      setNeedsProfile(false);
      setMsg("Profile saved ✅");

      const g = String(meUpdated?.group || "").trim().toLowerCase();
      if (g === "men" || g === "women") setSelectedGroup(g as any);

      await refreshList();
      setTimeout(() => setMsg(""), 1200);
    } catch (e: any) {
      setMsg(`Error: ${e?.message || e}`);
    } finally {
      setSavingProfile(false);
    }
  }

  async function markAttending(eventId: string, attending: "YES" | "NO") {
    try {
      setMsg("Saving…");

      // ✅ Age verification for kids: block if going to event outside age range
      if (isKidProfile && attending === "YES") {
        const event = events.find((e: any) => e.event_id === eventId);
        const ageRange = (event as any)?.age_range;

        if (ageRange) {
          const kidData = (me as any)?.kids_profiles?.find((k: any) => k.kid_id === activeProfileId);
          // ✅ Use date_of_birth (field name from Firestore) instead of birth_date
          const kidBirthDate = kidData?.date_of_birth;
          const kidAge = calculateAge(kidBirthDate ? new Date(kidBirthDate) : null);
          
          if (!isAgeInRange(kidAge, ageRange.min, ageRange.max)) {
            const msg = getAgeEligibilityMessage(kidAge, ageRange.min, ageRange.max);
            setMsg(msg || "Age not eligible for this event");
            return;
          }
        }
      }

      // ✅ Optimistic UI update: prevents "UNKNOWN" flash and makes UI consistent immediately
      setEvents((prev) =>
        prev.map((ev: any) =>
          ev.event_id === eventId
            ? {
                ...ev,
                my_attending: attending,
              }
            : ev
        )
      );

      // Route to correct API based on profile type
      if (isKidProfile && activeProfileId) {
        // Kid attendance
        await apiPost(`/api/kids/${encodeURIComponent(activeProfileId)}/attendance`, { 
          event_id: eventId, 
          attending 
        });
      } else {
        // Parent/adult attendance
        await apiPost(`/api/events/${encodeURIComponent(eventId)}/attending`, { attending });
      }

      // Keep server as source of truth (also refreshes any derived fields)
      await refreshList();

      setMsg(attending === "YES" ? "Marked: I’m going ✅" : "Marked: Not going ✅");
      setTimeout(() => setMsg(""), 1200);
    } catch (e: any) {
      // revert by refresh
      await refreshList().catch(() => {});
      setMsg(`Error: ${e?.message || e}`);
    }
  }

  async function markPaid(ev: HomeEvent) {
    const ok = window.confirm("Did you complete the bank transfer? You may be asked to verify later.");
    if (!ok) return;

    try {
      setMsg("Saving…");

      // ✅ Optimistic: show pending immediately
      setEvents((prev) =>
        prev.map((x: any) =>
          x.event_id === ev.event_id
            ? {
                ...x,
                my_paid_status: "PENDING",
              }
            : x
        )
      );

      // ✅ Route to correct API based on profile type
      if (isKidProfile && activeProfileId) {
        // Kid payment
        await apiPost(`/api/kids/${encodeURIComponent(activeProfileId)}/paid`, { 
          event_id: ev.event_id,
          paid_status: "PENDING" 
        });
      } else {
        // Parent/adult payment
        await apiPost(`/api/events/${encodeURIComponent(ev.event_id)}/paid`, { paid_status: "PENDING" });
      }

      await refreshList();
      setMsg("Pending Confirmation ⏳");
      setTimeout(() => setMsg(""), 1200);
    } catch (e: any) {
      await refreshList().catch(() => {});
      setMsg(`Error: ${e?.message || e}`);
    }
  }

  async function openFriendsGoing(eventId: string) {
    setFriendsErr("");
    setFriendsOpenEventId(eventId);
    if (friendsCache[eventId]) return;

    try {
      setFriendsLoading(true);
      const data = (await apiGet(`/api/events/${encodeURIComponent(eventId)}/attendees`)) as FriendsGoing;
      setFriendsCache((prev) => ({ ...prev, [eventId]: data }));
    } catch (e: any) {
      setFriendsErr(String(e?.message || e));
    } finally {
      setFriendsLoading(false);
    }
  }

  function closeFriends() {
    setFriendsOpenEventId(null);
    setFriendsErr("");
    setFriendsLoading(false);
  }

  return {
    me,
    events,
    msg,

    monthOptions,
    yearOptions,
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    selectedGroup,
    setSelectedGroup,
    selectedType,
    setSelectedType,

    isKidProfile,

    needsProfile,
    profileGroup,
    setProfileGroup,
    profileMemberType,
    setProfileMemberType,
    profilePhone,
    setProfilePhone,
    savingProfile,
    saveProfile,

    markAttending,
    markPaid,

    friendsCache,
    friendsOpenEventId,
    friendsLoading,
    friendsErr,
    openFriendsGoing,
    closeFriends,

    clampPct,
    isMembershipEvent,

    isAdmin,
  };
}
