"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, CheckCircle2, XCircle } from "lucide-react";
import type { EventInfo, PaidStatus, PlayerAttendanceRow } from "../types";
import { money } from "../helpers";

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
            <Users className="h-5 w-5 text-primary" />
            Players
          </span>
          <Badge variant="secondary">{p.rows.length} total</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="px-3 py-2 text-left font-semibold">Name</th>
              <th className="px-2 py-1 text-center font-semibold">Attended</th>
              <th className="px-3 py-2 text-center font-semibold">Actions</th>
              <th className="px-3 py-2 text-center font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {p.rows.map((r) => {
              const due = r.fee_due === "" || r.fee_due === null || typeof r.fee_due === "undefined" ? null : Number(r.fee_due);
              const hasDiscount = Number.isFinite(due) && baseFee && due !== baseFee;
              const attendingYes = String(r.attending || "").toUpperCase() === "YES";
              const savingThis = p.saving === r.player_id;
              let statusBadge = null;
              switch (r.paid_status) {
                case "PAID":
                  statusBadge = <Badge className="bg-green-100 text-green-700 border-green-200">Paid</Badge>;
                  break;
                case "PENDING":
                  statusBadge = <Badge className="bg-blue-100 text-blue-700 border-blue-200">Pending</Badge>;
                  break;
                case "REJECTED":
                  statusBadge = <Badge className="bg-red-100 text-red-700 border-red-200">Rejected</Badge>;
                  break;
                default:
                  statusBadge = <Badge variant="outline">Unpaid</Badge>;
              }
              return (
                <tr key={r.player_id} className={r.attended ? "bg-green-50/30 dark:bg-green-950/10" : ""}>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="font-medium">{r.name}</span>
                    {hasDiscount && (
                      <Badge className="ml-2 bg-yellow-100 text-yellow-800 border-yellow-200" title="Discounted">
                        %
                      </Badge>
                    )}
                  </td>
                  <td className="px-2 py-1 text-center">
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="form-checkbox h-4 w-4 text-green-600"
                        checked={r.attended}
                        disabled={!attendingYes || savingThis}
                        onChange={() => p.onToggleAttended(r.player_id, !r.attended)}
                        title={!attendingYes ? "Only enabled when attending=YES" : "Toggle attendance"}
                      />
                      <span className={`ml-2 text-xs font-medium ${r.attended ? "text-green-700" : "text-muted-foreground"}`}>{r.attended ? "Yes" : "No"}</span>
                    </label>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        className={`inline-flex items-center px-2 py-1 rounded border text-xs font-medium transition-colors ${r.paid_status === "PENDING" && r.attended ? "bg-green-50 hover:bg-green-100 text-green-700 border-green-200" : "opacity-50 cursor-not-allowed"}`}
                        disabled={r.paid_status !== "PENDING" || !r.attended || savingThis}
                        title={r.paid_status !== "PENDING" ? "Waiting for player to mark as paid" : "Confirm payment"}
                        onClick={() => p.onSetPaidStatus(r.player_id, "PAID")}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Confirm
                      </button>
                      <button
                        className={`inline-flex items-center px-2 py-1 rounded border text-xs font-medium transition-colors ${r.paid_status === "PENDING" && r.attended ? "bg-red-50 hover:bg-red-100 text-red-700 border-red-200" : "opacity-50 cursor-not-allowed"}`}
                        disabled={r.paid_status !== "PENDING" || !r.attended || savingThis}
                        title={r.paid_status !== "PENDING" ? "Waiting for player to mark as paid" : "Reject / missing payment"}
                        onClick={() => p.onSetPaidStatus(r.player_id, "REJECTED")}
                      >
                        <XCircle className="h-4 w-4 mr-1" /> Reject
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">{statusBadge}</td>
                </tr>
              );
            })}
            {p.rows.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No players registered yet.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
