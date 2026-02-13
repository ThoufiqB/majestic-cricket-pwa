"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ExternalLink, 
  MessageCircle, 
  Pencil, 
  Trash2,
  Users,
  CreditCard,
  Clock,
  AlertCircle
} from "lucide-react";
import { EVENT_TYPE_LABEL } from "../constants";
import type { EventRow } from "../services";
import { WhatsAppPopup } from "./WhatsAppPopup";

type Props = {
  ev: EventRow;

  waOpen: boolean;
  onOpenWhatsApp: () => void;
  onCloseWhatsApp: () => void;

  onEdit: () => void;
  onDelete: () => void;
  onCopyWhatsApp: () => void;

  whatsAppText: string;
  formatMembershipSubtitle: (ev: EventRow) => string;
  
  detailPagePath?: string;
};

export function EventCard(p: Props) {
  const ev = p.ev;
  const s = (ev as any).stats || { going: 0, paid: 0, unpaid: 0, pending: 0 };
  const isPast = !!ev._is_past;

  return (
    <Card className={`overflow-hidden transition-all hover:shadow-md ${isPast ? "opacity-75" : ""}`}>
      <CardContent className="p-4">
        <div className="relative flex items-start gap-4 pt-0.5">
          {/* WhatsApp Copy Icon Top Right */}
          {!isPast && (
            <div className="absolute top-0 right-0 flex items-center gap-4 p-2">
              <button
                type="button"
                onClick={p.onOpenWhatsApp}
                className="text-green-600 hover:text-green-700 focus:outline-none"
                title="Copy WhatsApp Message"
              >
                <MessageCircle className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={p.onDelete}
                className="text-destructive hover:text-red-700 focus:outline-none"
                title="Delete Event"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          )}
          {/* Left: Event Info */}
          <div className="min-w-0 flex-1 space-y-3">
            {/* Title + Type Badge */}
            <div className="space-y-0">
              <div className="flex items-center gap-2">
                <a
                  href={`${p.detailPagePath || '/admin/events'}/${ev.event_id}`}
                  className="font-semibold text-base text-primary underline truncate hover:text-blue-600 focus:text-blue-700 transition-colors"
                  title={ev.title}
                >
                  {ev.title}
                </a>
                {!isPast && (
                  <button
                    type="button"
                    onClick={p.onEdit}
                    className="ml-2 text-muted-foreground hover:text-blue-600 focus:outline-none"
                    title="Edit Event"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <Badge variant="secondary">
                  {EVENT_TYPE_LABEL[ev.event_type] || ev.event_type}
                </Badge>
                {/* Show target groups (multi-group support) */}
                {ev.targetGroups && Array.isArray(ev.targetGroups) && ev.targetGroups.length > 0 ? (
                  ev.targetGroups.map((grp: string) => (
                    <Badge key={grp} variant="outline" className="capitalize">
                      {String(grp).toLowerCase()}
                    </Badge>
                  ))
                ) : ev.group ? (
                  <Badge variant="outline" className="capitalize">
                    {String(ev.group).toLowerCase()}
                  </Badge>
                ) : null}
                <Badge className="bg-accent text-accent-foreground">
                  £{Number(ev.fee || 0).toFixed(2)}
                </Badge>
              </div>
            </div>

            {/* Date/Time */}
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {ev.event_type === "membership_fee"
                ? p.formatMembershipSubtitle(ev)
                : new Date(ev.starts_at).toLocaleString()}
            </p>

            {/* Stats Row */}
            <div className="flex flex-wrap gap-2 text-sm mb-0.5">
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Going:</span>
                <span className="font-semibold">{s.going}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CreditCard className="h-4 w-4 text-green-600" />
                <span className="text-muted-foreground">Paid:</span>
                <span className="font-semibold text-green-600">{s.paid}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <span className="text-muted-foreground">Unpaid:</span>
                <span className="font-semibold text-orange-500">{s.unpaid}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-muted-foreground">Pending:</span>
                <span className="font-semibold text-blue-500">{s.pending}</span>
              </div>
            </div>

            {/* Past event warning */}
            {isPast && (
              <p className="text-xs text-muted-foreground italic">
                Past/started event — editing & deletion locked.
              </p>
            )}
          </div>

        </div>

        {/* Actions Row: decluttered, horizontal below stats */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* WhatsApp and Delete buttons removed from actions row */}
        </div>

        {/* WhatsApp Popup */}
        {p.waOpen && (
          <WhatsAppPopup
            ev={ev}
            text={p.whatsAppText}
            onClose={p.onCloseWhatsApp}
            onCopy={p.onCopyWhatsApp}
          />
        )}
      </CardContent>
    </Card>
  );
}
