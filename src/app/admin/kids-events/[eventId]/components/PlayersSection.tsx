"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Baby } from "lucide-react";
import type { EventInfo, PaidStatus, PlayerAttendanceRow } from "../types";
import { PlayerCard } from "./PlayerCard";

type Props = {
  event: EventInfo | null;
  rows: PlayerAttendanceRow[];
  saving: string;

  onToggleAttended: (playerId: string, attended: boolean) => void;
  onSetPaidStatus: (playerId: string, status: PaidStatus) => void;
};

export function PlayersSection(p: Props) {
  const baseFee = Number(p.event?.fee || 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Baby className="h-5 w-5 text-accent" />
            Kids Attending
          </span>
          <Badge variant="secondary">{p.rows.length} total</Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {p.rows.map((r) => (
          <PlayerCard
            key={r.player_id}
            row={r}
            baseFee={baseFee}
            saving={p.saving}
            onToggleAttended={p.onToggleAttended}
            onSetPaidStatus={p.onSetPaidStatus}
          />
        ))}

        {p.rows.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Baby className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No kids registered yet.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
