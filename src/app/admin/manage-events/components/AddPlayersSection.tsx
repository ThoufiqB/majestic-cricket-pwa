"use client";

import { useState } from "react";
import { useManageEvents } from "../useManageEvents";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

/**
 * AddPlayersSection
 *
 * A basic UI for selecting an event and adding players or kids.  The
 * selection controls are simplified – in a full implementation you
 * would provide month/group/type filters and searchable multi‑select
 * dropdowns.  For demonstration purposes this component lists events
 * and accepts comma‑separated player/kid IDs.
 */
export function AddPlayersSection() {
  const { events, addPlayers, loadingEvents } = useManageEvents();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [playerIdsInput, setPlayerIdsInput] = useState<string>("");
  const [kidIdsInput, setKidIdsInput] = useState<string>("");
  const [msg, setMsg] = useState<string>("");

  async function handleAdd() {
    if (!selectedEventId) {
      setMsg("Please select an event");
      return;
    }
    const players = playerIdsInput
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter((s) => s);
    const kids = kidIdsInput
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter((s) => s);
    try {
      setMsg("Adding…");
      await addPlayers(selectedEventId, players, kids);
      setMsg("Added successfully ✅");
      setPlayerIdsInput("");
      setKidIdsInput("");
    } catch (e: any) {
      setMsg(`Error: ${e?.message || e}`);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Add players to an event</h2>
      <p className="text-sm text-muted-foreground">
        Select an event and enter comma‑separated player IDs or kid IDs to mark
        them as attended.
      </p>
      {loadingEvents ? (
        <p>Loading events…</p>
      ) : (
        <select
          className="w-full border rounded p-2"
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
        >
          <option value="">Select event</option>
          {events.map((ev: any) => (
            <option key={ev.event_id} value={ev.event_id}>
              {ev.title} – {new Date(ev.starts_at).toLocaleString()}
            </option>
          ))}
        </select>
      )}
      <input
        type="text"
        className="w-full border rounded p-2"
        placeholder="Player IDs (comma separated)"
        value={playerIdsInput}
        onChange={(e) => setPlayerIdsInput(e.target.value)}
      />
      <input
        type="text"
        className="w-full border rounded p-2"
        placeholder="Kid IDs (comma separated)"
        value={kidIdsInput}
        onChange={(e) => setKidIdsInput(e.target.value)}
      />
      <Button onClick={handleAdd}>Add</Button>
      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
      <Separator />
    </div>
  );
}