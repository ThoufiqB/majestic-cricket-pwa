"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Loader2,
  Baby,
  Banknote
} from "lucide-react";
import type { PaidStatus, PlayerAttendanceRow } from "../types";
import { displayName, money, normalizePaidStatus, paidLabel } from "../helpers";

type Props = {
  row: PlayerAttendanceRow;
  baseFee: number;

  saving: string;

  onToggleAttended: (playerId: string, attended: boolean) => void;
  onSetPaidStatus: (playerId: string, status: PaidStatus) => void;
};

function getStatusBadge(status: PaidStatus) {
  switch (status) {
    case "PAID":
      return <Badge className="bg-green-100 text-green-700 border-green-200">Paid</Badge>;
    case "PENDING":
      return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Pending</Badge>;
    case "REJECTED":
      return <Badge className="bg-red-100 text-red-700 border-red-200">Rejected</Badge>;
    default:
      return <Badge variant="outline">Unpaid</Badge>;
  }
}

export function PlayerCard(p: Props) {
  const r = p.row;

  const due =
    r.fee_due === "" || r.fee_due === null || typeof r.fee_due === "undefined"
      ? null
      : Number(r.fee_due);

  const dueDisplay = Number.isFinite(due) ? money(due) : p.baseFee ? money(p.baseFee) : "";
  const attendingYes = String(r.attending || "").toUpperCase() === "YES";

  const st = normalizePaidStatus(r.paid_status);
  const savingThis = p.saving === r.player_id;

  return (
    <Card className={`transition-all ${r.attended ? "border-accent/50 bg-accent/5" : ""}`}>
      <CardContent className="pt-4 space-y-3">
        {/* Player Info Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Baby className="h-4 w-4 text-accent shrink-0" />
              <span className="font-medium truncate">{displayName(r)}</span>
              {savingThis && <Loader2 className="h-4 w-4 animate-spin text-accent" />}
            </div>
            
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                Attending: 
                <Badge variant={attendingYes ? "default" : "outline"} className="text-xs">
                  {r.attending || "—"}
                </Badge>
              </span>
              <span className="flex items-center gap-1">
                <Banknote className="h-3.5 w-3.5" />
                Fee: {dueDisplay ? `£${dueDisplay}` : "—"}
                {Number.isFinite(due) && p.baseFee && due !== p.baseFee && (
                  <span className="text-muted-foreground">(Std £{money(p.baseFee)})</span>
                )}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {getStatusBadge(st)}
            {r.attended && (
              <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30 text-xs">
                ✓ Attended
              </Badge>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {/* Attended Toggle */}
          <Button
            variant={r.attended ? "default" : "outline"}
            size="sm"
            className={`w-full ${r.attended ? "bg-accent hover:bg-accent/90" : ""}`}
            disabled={!attendingYes || savingThis}
            onClick={() => p.onToggleAttended(r.player_id, !r.attended)}
            title={!attendingYes ? "Only enabled when attending=YES" : "Toggle attendance"}
          >
            {r.attended ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Attended ✔
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Mark Attended
              </>
            )}
          </Button>

          {/* Payment Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className={st === "PENDING" ? "bg-green-50 hover:bg-green-100 text-green-700 border-green-200" : "opacity-50"}
              disabled={st !== "PENDING" || savingThis}
              onClick={() => p.onSetPaidStatus(r.player_id, "PAID")}
              title={st !== "PENDING" ? "Waiting for player to mark as paid" : "Confirm payment"}
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Confirm
            </Button>

            <Button
              variant="outline"
              size="sm"
              className={st === "PENDING" ? "bg-red-50 hover:bg-red-100 text-red-700 border-red-200" : "opacity-50"}
              disabled={st !== "PENDING" || savingThis}
              onClick={() => p.onSetPaidStatus(r.player_id, "REJECTED")}
              title={st !== "PENDING" ? "Waiting for player to mark as paid" : "Reject / missing payment"}
            >
              <XCircle className="h-4 w-4 mr-1.5" />
              Reject
            </Button>
          </div>

          {/* Reset Button */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            disabled={savingThis || st === "UNPAID"}
            onClick={() => p.onSetPaidStatus(r.player_id, "UNPAID")}
            title="Reset back to Unpaid"
          >
            <RotateCcw className="h-4 w-4 mr-1.5" />
            Reset to Unpaid
          </Button>
        </div>

        {/* Helper Messages */}
        {!attendingYes && (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
            Buttons disabled because Attending is not YES. If they turned up, mark them as attended first.
          </p>
        )}

        {attendingYes && !r.attended && (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
            Mark player as Attended first to enable payment tracking.
          </p>
        )}

        {attendingYes && r.attended && st === "UNPAID" && (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
            Waiting for player to click "Mark as Paid" before you can confirm or reject.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
