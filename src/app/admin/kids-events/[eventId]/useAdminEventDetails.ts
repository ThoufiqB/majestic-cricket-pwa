"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { EventInfo, PaidStatus, PlayerAttendanceRow, Totals } from "./types";
import { normalizePaidStatus } from "./helpers";
import { adminUpdateKidsEventAttendance, getAdminKidsEventAttendance } from "./services";

export function useAdminEventDetails(eventId: string) {
  const [err, setErr] = useState<string>("");
  const [msg, setMsg] = useState<string>("");

  const [event, setEvent] = useState<EventInfo | null>(null);
  const [rows, setRows] = useState<PlayerAttendanceRow[]>([]);
  const [saving, setSaving] = useState<string>(""); // player_id or "bulk"
  const [needsAuth, setNeedsAuth] = useState(false);

  const load = useCallback(async () => {
    setErr("");
    setMsg("");
    setNeedsAuth(false);

    const { event: ev, rows: r } = await getAdminKidsEventAttendance(eventId);

    setEvent(ev);
    setRows(
      (r || []).map((x) => ({
        ...x,
        paid_status: normalizePaidStatus((x as any).paid_status),
      }))
    );
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return;
    load().catch((e: any) => {
      const m = String(e?.message || e);
      setErr(m);
      if (String((e as any)?.status || "").startsWith("401") || m.toLowerCase().includes("auth")) {
        setNeedsAuth(true);
      }
    });
  }, [eventId, load]);

  const setAttended = useCallback(
    async (player_id: string, attended: boolean) => {
      setErr("");
      setMsg("");
      setSaving(player_id);

      try {
        await adminUpdateKidsEventAttendance(eventId, player_id, { attended });
        await load();
      } catch (e: any) {
        setErr(String(e?.message || e));
      } finally {
        setSaving("");
      }
    },
    [eventId, load]
  );

  const setPaidStatus = useCallback(
    async (player_id: string, paid_status: PaidStatus) => {
      setErr("");
      setMsg("");
      setSaving(player_id);

      try {
        await adminUpdateKidsEventAttendance(eventId, player_id, { paid_status });
        await load();
      } catch (e: any) {
        setErr(String(e?.message || e));
      } finally {
        setSaving("");
      }
    },
    [eventId, load]
  );

  const bulkMarkAttendedYes = useCallback(async () => {
    const ok = window.confirm(
      "Bulk mark Attended = YES for everyone who marked Attending = YES?\n\nYou can adjust exceptions afterwards."
    );
    if (!ok) return;

    setErr("");
    setMsg("");
    setSaving("bulk");

    try {
      const yesNotAttended = rows.filter(
        (r) => String(r.attending || "").toUpperCase() === "YES" && !r.attended
      );

      for (const r of yesNotAttended) {
        await adminUpdateKidsEventAttendance(eventId, r.player_id, { attended: true });
      }

      await load();
      setMsg(`Bulk marked attended for ${yesNotAttended.length} player(s) ✅`);
      setTimeout(() => setMsg(""), 1500);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving("");
    }
  }, [eventId, rows, load]);

  const totals: Totals = useMemo(() => {
    const baseFee = Number((event as any)?.fee || 0);

    let yesCount = 0;
    let expectedSum = 0;

    let paidConfirmedSum = 0;
    let pendingSum = 0;

    let paidCount = 0;
    let pendingCount = 0;
    let rejectedCount = 0;
    let unpaidCount = 0;

    for (const r of rows) {
      const attendingYes = String(r.attending || "").toUpperCase() === "YES";
      if (!attendingYes) continue;

      yesCount += 1;

      const due =
        (r as any).fee_due === "" || (r as any).fee_due === null || typeof (r as any).fee_due === "undefined"
          ? baseFee
          : Number((r as any).fee_due);

      if (Number.isFinite(due)) expectedSum += due;

      const st = normalizePaidStatus((r as any).paid_status);

      if (st === "PAID") {
        paidCount += 1;
        if (Number.isFinite(due)) paidConfirmedSum += due;
      } else if (st === "PENDING") {
        pendingCount += 1;
        if (Number.isFinite(due)) pendingSum += due;
      } else if (st === "REJECTED") {
        rejectedCount += 1;
      } else {
        unpaidCount += 1;
      }
    }

    return {
      baseFee,
      yesCount,
      expectedSum,
      paidConfirmedSum,
      pendingSum,
      paidCount,
      pendingCount,
      rejectedCount,
      unpaidCount,
    };
  }, [rows, event]);

  return {
    needsAuth,
    err,
    msg,
    event,
    rows,
    saving,
    totals,
    load,
    setAttended,
    setPaidStatus,
    bulkMarkAttendedYes,
    setErr,
    setMsg,
  };
}
