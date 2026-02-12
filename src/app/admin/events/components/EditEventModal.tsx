"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Save, Loader2, Calendar, Clock, Banknote, Type } from "lucide-react";
import type { EventRow } from "../services";
import { EVENT_TYPE_LABEL } from "../constants";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function dateStrFromIso(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function timePartsFromIso(iso: string) {
  const d = new Date(iso);
  let h = d.getHours();
  const minute = d.getMinutes();
  const ampm: "AM" | "PM" = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return { hour12: h, minute, ampm };
}

function isoFromDateAndTime(dateStr: string, hour12: number, minute: number, ampm: "AM" | "PM") {
  const [y, m, d] = dateStr.split("-").map((x) => Number(x));
  let h = Number(hour12);
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  const dt = new Date(y, (m || 1) - 1, d || 1, h, Number(minute || 0), 0, 0);
  return dt.toISOString();
}

export function EditEventModal(props: {
  open: boolean;
  event: EventRow | null;
  onClose: () => void;
  onSave: (patch: { title: string; fee: number; starts_at: string }) => Promise<void>;
}) {
  const { open, event, onClose, onSave } = props;

  const [title, setTitle] = useState("");
  const [fee, setFee] = useState<number>(0);

  const [dateStr, setDateStr] = useState("");
  const [hour12, setHour12] = useState<number>(6);
  const [minute, setMinute] = useState<number>(0);
  const [ampm, setAmpm] = useState<"AM" | "PM">("PM");

  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const typeLabel = useMemo(() => {
    if (!event) return "";
    return EVENT_TYPE_LABEL[event.event_type] || event.event_type;
  }, [event]);

  useEffect(() => {
    if (!open || !event) return;
    setErr("");
    setSaving(false);

    setTitle(String(event.title || ""));
    setFee(Number(event.fee || 0));

    const ds = dateStrFromIso(event.starts_at);
    const tp = timePartsFromIso(event.starts_at);

    setDateStr(ds);
    setHour12(tp.hour12);
    setMinute(tp.minute);
    setAmpm(tp.ampm);
  }, [open, event]);

  if (!event) return null;

  const isPast = !!event._is_past;

  async function save() {
    if (isPast) {
      setErr("Cannot edit: event has started/passed.");
      return;
    }
    setErr("");

    const t = title.trim();
    if (!t) return setErr("Event Banner required");
    if (!Number.isFinite(Number(fee)) || Number(fee) < 0) return setErr("Fee must be valid");
    if (!dateStr) return setErr("Date required");

    const starts_at = isoFromDateAndTime(dateStr, hour12, minute, ampm);

    setSaving(true);
    try {
      await onSave({ title: t, fee: Number(fee), starts_at });
      onClose();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
          <DialogDescription>
            {typeLabel} • {String(event.group || "No group")}
          </DialogDescription>
        </DialogHeader>

        {isPast && (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              This event already started/passed. Editing is disabled.
            </p>
          </div>
        )}

        {!!err && (
          <p className="text-sm text-destructive">{err}</p>
        )}

        <div className="space-y-4">
          {/* Event Banner */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Type className="h-4 w-4 text-muted-foreground" />
              Event Banner
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isPast}
              placeholder="Event title"
            />
          </div>

          {/* Date + Fee Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Date
              </Label>
              <Input
                type="date"
                className="[color-scheme:light] dark:[color-scheme:dark]"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                disabled={isPast}
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Banknote className="h-4 w-4 text-muted-foreground" />
                Fee (£)
              </Label>
              <Input
                type="number"
                value={fee}
                onChange={(e) => setFee(Number(e.target.value))}
                disabled={isPast}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Time Row */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Time
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <Select
                value={String(hour12)}
                onValueChange={(v) => setHour12(Number(v))}
                disabled={isPast}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Hour" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }).map((_, i) => {
                    const v = i + 1;
                    return (
                      <SelectItem key={v} value={String(v)}>
                        {v}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              <Select
                value={String(minute)}
                onValueChange={(v) => setMinute(Number(v))}
                disabled={isPast}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Min" />
                </SelectTrigger>
                <SelectContent>
                  {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {pad2(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={ampm}
                onValueChange={(v) => setAmpm(v as "AM" | "PM")}
                disabled={isPast}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AM">AM</SelectItem>
                  <SelectItem value="PM">PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={isPast || saving}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
