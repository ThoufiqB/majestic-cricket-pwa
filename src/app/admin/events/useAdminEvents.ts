"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  adminCreateEvent,
  adminDeleteEvent,
  adminListEventsByMonth,
  adminUpdateEvent,
  type EventRow,
} from "./services";
import { EVENT_TYPE_LABEL } from "./constants";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function monthKeyFromDate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}
function monthLabelFromKey(key: string) {
  const [y, m] = key.split("-").map((x) => Number(x));
  const dt = new Date(Date.UTC(y, (m || 1) - 1, 1));
  return dt.toLocaleString(undefined, { month: "short", year: "numeric" });
}
function buildMonthOptions(count: number = 7) {
  const now = new Date();
  const opts: { key: string; label: string }[] = [];
  for (let i = -1; i < count - 1; i++) {
    const d = new Date(now);
    d.setMonth(now.getMonth() + i);
    const key = monthKeyFromDate(d);
    opts.push({ key, label: monthLabelFromKey(key) });
  }
  const seen = new Set<string>();
  return opts.filter((o) => (seen.has(o.key) ? false : (seen.add(o.key), true)));
}

function startIsoFromDateAndTime(dateStr: string, hour12: number, minute: number, ampm: "AM" | "PM") {
  const [y, m, d] = dateStr.split("-").map((x) => Number(x));
  let h = Number(hour12);
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  const dt = new Date(y, (m || 1) - 1, d || 1, h, Number(minute || 0), 0, 0);
  return dt.toISOString();
}

function membershipStartsAtFromYear(year: number) {
  return new Date(Date.UTC(year, 0, 1, 0, 0, 0)).toISOString();
}

function formatMembershipSubtitle(ev: EventRow) {
  const y = new Date(ev.starts_at).getUTCFullYear();
  return `Year ${y}`;
}

function buildWhatsAppText(ev: EventRow) {
  const typeLabel = EVENT_TYPE_LABEL[ev.event_type] || ev.event_type;
  const g = String(ev.group || "").toLowerCase();

  let line1 = `📣 *${ev.title}*`;
  let line2 = "";
  if (ev.event_type === "membership_fee") {
    const y = new Date(ev.starts_at).getUTCFullYear();
    line2 = `🗓️ Year ${y} • ${typeLabel}${g ? ` • ${g}` : ""}`;
  } else {
    line2 = `🗓️ ${new Date(ev.starts_at).toLocaleString()} • ${typeLabel}${g ? ` • ${g}` : ""}`;
  }
  const line3 = `💷 Fee: £${Number(ev.fee || 0).toFixed(2)}`;
  const line5 = `Please mark attendance in the app:\nhttps://www.majestic-foundation.com/`;

  return [line1, line2, line3, line5].filter(Boolean).join("\n");
}

export function useAdminEvents() {
  const [needsAuth, setNeedsAuth] = useState(false);
  const [err, setErr] = useState<string>("");
  const [msg, setMsg] = useState<string>("");

  // Create form
  const [eventType, setEventType] = useState<string>("net_practice");
  const [targetGroups, setTargetGroups] = useState<string[]>([]);
  const [createKidsEvent, setCreateKidsEvent] = useState<boolean>(false);

  // For normal events
  const [dateStr, setDateStr] = useState<string>("");
  const [hour12, setHour12] = useState<number>(6);
  const [minute, setMinute] = useState<number>(0);
  const [ampm, setAmpm] = useState<"AM" | "PM">("PM");

  // Membership
  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    const ys: number[] = [];
    for (let y = currentYear - 1; y <= currentYear + 3; y++) ys.push(y);
    return ys;
  }, [currentYear]);
  const [membershipYear, setMembershipYear] = useState<number>(currentYear);

  // Fee + title
  const [fee, setFee] = useState<number>(0);
  const [banner, setBanner] = useState<string>("");
  const [bannerTouched, setBannerTouched] = useState<boolean>(false);

  // Browse
  const monthOptions = useMemo(() => buildMonthOptions(7), []);
  const [browseMonth, setBrowseMonth] = useState<string>(monthKeyFromDate(new Date()));
  const [browseGroup, setBrowseGroup] = useState<"all" | "men" | "women" | "u-13" | "u-15" | "u-18">("all");
  const [browseView, setBrowseView] = useState<"scheduled" | "past" | "all">("scheduled");
  const [events, setEvents] = useState<EventRow[]>([]);

  // WhatsApp
  const [waOpenEventId, setWaOpenEventId] = useState<string | null>(null);

  // Edit modal (Option 1)
  const [editingEvent, setEditingEvent] = useState<EventRow | null>(null);

  const isMembership = eventType === "membership_fee";

  const loadBrowse = useCallback(async () => {
    setErr("");
    setMsg("Loading…");
    setNeedsAuth(false);

    try {
      const { events } = await adminListEventsByMonth({
        month: browseMonth,
        group: browseGroup,
        view: browseView,
      });
      setEvents(events);
      setMsg("");
    } catch (e: any) {
      const m = String(e?.message || e);
      setErr(m);
      setMsg("");
      if (m.toLowerCase().includes("missing auth")) setNeedsAuth(true);
    }
  }, [browseMonth, browseGroup, browseView]);

  useEffect(() => {
    loadBrowse();
  }, [loadBrowse]);

  // Auto-fill banner
  useEffect(() => {
    if (bannerTouched) return;
    const typeLabel = EVENT_TYPE_LABEL[eventType] || eventType;

    if (isMembership) {
      setBanner(`${typeLabel} ${membershipYear}`);
      return;
    }

    if (!dateStr) {
      setBanner(typeLabel);
      return;
    }

    const dt = new Date(dateStr + "T00:00:00");
    const day = dt.getDate();
    const mon = dt.toLocaleString(undefined, { month: "short" });
    setBanner(`${typeLabel} • ${mon} ${day}`);
  }, [eventType, dateStr, membershipYear, bannerTouched, isMembership]);

  const createEvent = useCallback(async () => {
    setErr("");
    setMsg("");
    setNeedsAuth(false);

    const title = banner.trim();
    if (!title) return setErr("Event Banner required");
    if (!Number.isFinite(Number(fee))) return setErr("Fee must be a number");

    // Validate targetGroups
    if (!createKidsEvent && targetGroups.length === 0) {
      return setErr("Please select at least one target group");
    }

    // Validate kids event
    if (createKidsEvent && isMembership) {
      return setErr("Kids events cannot be membership fees");
    }

    let starts_at = "";
    if (isMembership) {
      const y = Number(membershipYear);
      if (!Number.isFinite(y) || y < 2000 || y > 2100) return setErr("Invalid membership year");
      starts_at = membershipStartsAtFromYear(y);
    } else {
      if (!dateStr || dateStr.trim() === "") return setErr("Date required");
      const parts = dateStr.split("-");
      if (parts.length !== 3) return setErr("Invalid date format");
      starts_at = startIsoFromDateAndTime(dateStr, hour12, minute, ampm);
    }

    try {
      await adminCreateEvent({
        title,
        event_type: eventType,
        targetGroups: createKidsEvent ? ["Kids"] : targetGroups,
        starts_at,
        fee: Number(fee || 0),
      });

      setFee(0);
      setBannerTouched(false);
      setTargetGroups([]);
      setCreateKidsEvent(false);
      if (!isMembership) {
        setDateStr("");
        setHour12(6);
        setMinute(0);
        setAmpm("PM");
      } else {
        setMembershipYear(currentYear);
      }

      await loadBrowse();
      setMsg("Event created ✅");
      setTimeout(() => setMsg(""), 1200);
    } catch (e: any) {
      const m = String(e?.message || e);
      setErr(m);
      if (m.toLowerCase().includes("missing auth")) setNeedsAuth(true);
    }
  }, [
    banner,
    fee,
    isMembership,
    membershipYear,
    dateStr,
    hour12,
    minute,
    ampm,
    eventType,
    targetGroups,
    createKidsEvent,
    currentYear,
    loadBrowse,
  ]);

  // Option 1: DELETE (future only)
  const deleteEvent = useCallback(
    async (ev: EventRow) => {
      if (ev._is_past) {
        setErr("Cannot delete: event has started/passed.");
        return;
      }

      const ok = window.confirm("Delete this future event? This permanently removes it.");
      if (!ok) return;

      try {
        setErr("");
        setMsg("Deleting…");
        await adminDeleteEvent(ev.event_id);
        await loadBrowse();
        setMsg("Event deleted ✅");
        setTimeout(() => setMsg(""), 1200);
      } catch (e: any) {
        const m = String(e?.message || e);
        setErr(m);
        if (m.toLowerCase().includes("missing auth")) setNeedsAuth(true);
      }
    },
    [loadBrowse]
  );

  // Option 1: EDIT (future only)
  const openEdit = useCallback((ev: EventRow) => {
    if (ev._is_past) {
      setErr("Cannot edit: event has started/passed.");
      return;
    }
    setErr("");
    setEditingEvent(ev);
  }, []);

  const closeEdit = useCallback(() => setEditingEvent(null), []);

  const saveEdit = useCallback(
    async (patch: { title: string; fee: number; starts_at: string }) => {
      if (!editingEvent) return;

      if (editingEvent._is_past) {
        setErr("Cannot edit: event has started/passed.");
        return;
      }

      setErr("");
      setMsg("Saving…");

      try {
        await adminUpdateEvent(editingEvent.event_id, patch);

        // refresh list + close modal
        await loadBrowse();
        setEditingEvent(null);

        setMsg("Event updated ✅");
        setTimeout(() => setMsg(""), 1200);
      } catch (e: any) {
        const m = String(e?.message || e);
        setErr(m);
        if (m.toLowerCase().includes("missing auth")) setNeedsAuth(true);
        throw e;
      }
    },
    [editingEvent, loadBrowse]
  );

  const copyWhatsApp = useCallback(async (ev: EventRow) => {
    const txt = buildWhatsAppText(ev);
    try {
      await navigator.clipboard.writeText(txt);
      setMsg("Copied WhatsApp message ✅");
      setWaOpenEventId(null);
      setTimeout(() => setMsg(""), 1200);
    } catch {
      setErr("Could not copy automatically. Please copy manually.");
    }
  }, []);

  const signOutSession = useCallback(async () => {
    try {
      await fetch("/api/auth/sessionLogout", { method: "POST", credentials: "include" });
      window.location.href = "/";
    } catch {
      window.location.href = "/";
    }
  }, []);

  return {
    needsAuth,
    err,
    msg,

    eventType,
    setEventType,
    targetGroups,
    setTargetGroups,
    createKidsEvent,
    setCreateKidsEvent,
    dateStr,
    setDateStr,
    hour12,
    setHour12,
    minute,
    setMinute,
    ampm,
    setAmpm,
    membershipYear,
    setMembershipYear,
    yearOptions,
    fee,
    setFee,
    banner,
    setBanner,
    setBannerTouched,
    setErr,
    setMsg,
    setNeedsAuth,
    loadBrowse,

    monthOptions,
    browseMonth,
    setBrowseMonth,
    browseGroup,
    setBrowseGroup,
    browseView,
    setBrowseView,
    events,

    waOpenEventId,
    setWaOpenEventId,
    buildWhatsAppText,
    formatMembershipSubtitle,

    createEvent,

    // Option 1 actions
    deleteEvent,
    editingEvent,
    openEdit,
    closeEdit,
    saveEdit,

    copyWhatsApp,
    startIsoFromDateAndTime,
    monthLabelFromKey,
    isMembership,

    signOutSession,
  };
}
