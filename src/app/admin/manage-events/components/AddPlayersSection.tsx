"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useManageEvents } from "../useManageEvents";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { apiGet } from "@/app/client/api";
import { X } from "lucide-react";

type GroupFilter = "all" | "men" | "women" | "kids";

type Person = {
  id: string; // player_id or kid_id
  name: string;
  kind: "player" | "kid";
};

function monthKey(d: Date) {
  // "2026-01"
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthLabelFromKey(key: string) {
  const [y, m] = key.split("-").map((x) => Number(x));
  const date = new Date(Date.UTC(y, (m || 1) - 1, 1));
  return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" }).toUpperCase(); // "JAN 2026"
}

function addMonthsUTC(base: Date, delta: number) {
  return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + delta, 1));
}

function normalizeGroupFromEvent(ev: any): GroupFilter {
  // Kids events: either kids_event true OR group == "all_kids"
  const isKids = ev?.kids_event === true || String(ev?.group || "").toLowerCase() === "all_kids";
  if (isKids) return "kids";

  const g = String(ev?.group || "").toLowerCase();
  if (g === "men") return "men";
  if (g === "women") return "women";
  return "all";
}

function inMonth(ev: any, mKey: string) {
  const dt = new Date(ev?.starts_at);
  if (!Number.isFinite(dt.getTime())) return false;
  return monthKey(dt) === mKey;
}


export function AddPlayersSection() {
  const { events, addPlayers, loadingEvents, loadEvents } = useManageEvents();

  // Filters
  const [group, setGroup] = useState<GroupFilter>("all");
  const monthOptions = useMemo(() => {
    const now = new Date();
    const prev = monthKey(addMonthsUTC(now, -1));
    const cur = monthKey(addMonthsUTC(now, 0));
    const next = monthKey(addMonthsUTC(now, 1));
    return [prev, cur, next];
  }, []);
  const [month, setMonth] = useState<string>(() => monthOptions[1] || monthOptions[0] || "");

  const [selectedEventId, setSelectedEventId] = useState<string>("");

  // People search + select
  const [people, setPeople] = useState<Person[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [peopleErr, setPeopleErr] = useState<string>("");

  const [query, setQuery] = useState("");
  const [openDropdown, setOpenDropdown] = useState(false);
  const [selected, setSelected] = useState<Person[]>([]);

  const [msg, setMsg] = useState<string>("");

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const el = containerRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setOpenDropdown(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // If group/month changes -> reset event + selections (safe)
  useEffect(() => {
    setSelectedEventId("");
    setSelected([]);
    setQuery("");
    // Load events for selected group/month
    loadEvents(group, month);
  }, [group, month, loadEvents]);

  // Load people list (tries common endpoints; won’t break if 404)
  useEffect(() => {
    let cancelled = false;

    async function loadPeople() {
      setPeopleLoading(true);
      setPeopleErr("");

      const collected: Person[] = [];

      // Try a few endpoints that might exist in your app.
      // If your real endpoints differ, update these paths.
      const attempts: Array<{
        url: string;
        map: (data: any) => Person[];
      }> = [
        {
          url: `/api/admin/members/list${group !== "all" ? `?group=${group}` : ""}`,
          map: (data) => {
            const rows = Array.isArray(data?.members) ? data.members : [];
            return rows
              .map((m: any) => {
                const id = String(m?.player_id || m?.id || "");
                const name = String(m?.name || "").trim();
                if (!id || !name) return null;
                return { id, name, kind: "player" as const };
              })
              .filter(Boolean) as Person[];
          },
        },
        {
          url: "/api/admin/kids/list",
          map: (data) => {
            const rows = Array.isArray(data?.kids) ? data.kids : Array.isArray(data) ? data : [];
            return rows
              .map((k: any) => {
                const id = String(k?.kid_id || k?.id || "");
                const name = String(k?.name || k?.first_name || "").trim();
                if (!id || !name) return null;
                if (group !== "all" && group !== "kids") return null;
                return { id, name, kind: "kid" as const };
              })
              .filter(Boolean) as Person[];
          },
        },
      ];

      for (const a of attempts) {
        try {
          const data = await apiGet(a.url);
          const mapped = a.map(data);
          for (const person of mapped) collected.push(person);
        } catch {
          // ignore (404 etc) — we’ll show a helpful message if none worked
        }
      }

      if (cancelled) return;

      // de-dupe by kind+id
      const dedup = new Map<string, Person>();
      for (const p of collected) {
        dedup.set(`${p.kind}:${p.id}`, p);
      }
      const list = Array.from(dedup.values()).sort((a, b) => a.name.localeCompare(b.name));

      setPeople(list);

      if (list.length === 0) {
        setPeopleErr(
          "Couldn’t load member names (API returned 404). Ensure endpoints like /api/admin/members/list and /api/admin/kids/list are available (or update this component to your real paths)."
        );
      }

      setPeopleLoading(false);
    }

    loadPeople();
    return () => {
      cancelled = true;
    };
  }, [group]);

  // Phase 1: Add client-side group filter to ensure only events matching the selected group are shown
  const filteredEvents = useMemo(() => {
    const list = Array.isArray(events) ? events : [];
    // Always show all if group is 'all', otherwise filter by normalized group
    let filtered;
    if (group === "all") {
      filtered = list;
    } else if (group === "kids") {
      // Only show events that are truly kids events
      filtered = list.filter((ev: any) => ev?.kids_event === true || String(ev?.group || "").toLowerCase() === "all_kids");
    } else {
      filtered = list.filter((ev: any) => normalizeGroupFromEvent(ev) === group);
    }
    return filtered.sort((a: any, b: any) => new Date(a?.starts_at).getTime() - new Date(b?.starts_at).getTime());
  }, [events, group]);

  const selectedEvent = useMemo(() => {
    return filteredEvents.find((e: any) => String(e?.event_id) === String(selectedEventId)) || null;
  }, [filteredEvents, selectedEventId]);

  const canChooseNames = !!selectedEventId;

  const visiblePeople = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sel = new Set(selected.map((s) => `${s.kind}:${s.id}`));
    const base = q ? people.filter((p) => p.name.toLowerCase().includes(q)) : people;
    return base.filter((p) => !sel.has(`${p.kind}:${p.id}`)).slice(0, 25);
  }, [people, query, selected]);

  function addSelectedPerson(p: Person) {
    if (!canChooseNames) return;
    setSelected((prev) => [...prev, p]);
    setQuery("");
    setOpenDropdown(false);
  }

  function removeSelected(p: Person) {
    setSelected((prev) => prev.filter((x) => !(x.kind === p.kind && x.id === p.id)));
  }

  function clearAll() {
    setSelected([]);
    setQuery("");
    setMsg("");
  }

  async function handleAdd() {
    if (!selectedEventId) {
      setMsg("Please select an event");
      return;
    }
    if (selected.length === 0) {
      setMsg("Please select at least one name");
      return;
    }

    const playerIds = selected.filter((s) => s.kind === "player").map((s) => s.id);
    const kidIds = selected.filter((s) => s.kind === "kid").map((s) => s.id);

    try {
      setMsg("Adding…");
      await addPlayers(selectedEventId, playerIds, kidIds);
      setMsg("Added successfully ✅");
      clearAll();
    } catch (e: any) {
      setMsg(`Error: ${e?.message || e}`);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Add players to an event</h2>
        <p className="text-sm text-muted-foreground">
          Use filters to find the event and add members by name (no IDs).
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Group and Month in same row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Group</label>
            <select
              className="w-full border rounded-md p-2 bg-background"
              value={group}
              onChange={(e) => setGroup(e.target.value as GroupFilter)}
            >
              <option value="all">All</option>
              <option value="men">Men</option>
              <option value="women">Women</option>
              <option value="kids">Kids</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Month</label>
            <select
              className="w-full border rounded-md p-2 bg-background"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            >
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {monthLabelFromKey(m)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Event in next row */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Event</label>
          {loadingEvents ? (
            <div className="text-sm text-muted-foreground">Loading events…</div>
          ) : (
            <select
              className="w-full border rounded-md p-2 bg-background"
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
            >
              <option value="">Select Event</option>
              {filteredEvents.map((ev: any) => (
                <option key={ev.event_id} value={ev.event_id}>
                  {ev.title}
                </option>
              ))}
            </select>
          )}
          {!loadingEvents && filteredEvents.length === 0 && (
            <div className="text-xs text-muted-foreground">No events found for this group + month.</div>
          )}
        </div>

        {/* Name: searchable dropdown */}
        <div className="space-y-1" ref={containerRef}>
          <label className="text-sm font-medium">Name</label>

          <div className="relative">
            <input
              className="w-full border rounded-md p-2 bg-background"
              placeholder={canChooseNames ? "Start typing a name…" : "Select an event to enable name selection"}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!openDropdown) setOpenDropdown(true);
              }}
              onFocus={() => {
                if (canChooseNames) setOpenDropdown(true);
              }}
              disabled={!canChooseNames}
            />

            {/* Dropdown */}
            {openDropdown && canChooseNames && (
              <div className="absolute z-20 mt-1 w-full rounded-md border bg-background shadow-sm max-h-64 overflow-auto">
                {peopleLoading ? (
                  <div className="p-3 text-sm text-muted-foreground">Loading names…</div>
                ) : peopleErr ? (
                  <div className="p-3 text-sm text-muted-foreground">{peopleErr}</div>
                ) : visiblePeople.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground">No matches.</div>
                ) : (
                  visiblePeople.map((p) => (
                    <button
                      key={`${p.kind}:${p.id}`}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-muted/50 flex items-center justify-between"
                      onClick={() => addSelectedPerson(p)}
                    >
                      <span className="text-sm">{p.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {p.kind === "kid" ? "Kid" : "Adult"}
                      </Badge>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Selected chips */}
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {selected.map((p) => (
                <span
                  key={`${p.kind}:${p.id}`}
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm bg-background"
                >
                  <span>{p.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {p.kind === "kid" ? "Kid" : "Adult"}
                  </Badge>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => removeSelected(p)}
                    aria-label="Remove"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {selectedEvent && (
            <div className="text-xs text-muted-foreground pt-1">
              Selected event: <span className="font-medium">{selectedEvent.title}</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button onClick={handleAdd} disabled={!selectedEventId || selected.length === 0}>
          Add to Event
        </Button>
        <Button variant="outline" onClick={clearAll} disabled={selected.length === 0 && !query}>
          Clear
        </Button>
      </div>

      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}

      <Separator />
    </div>
  );
}
