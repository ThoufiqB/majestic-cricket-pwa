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
        <div className="flex items-start justify-between gap-4">
          {/* Left: Event Info */}
          <div className="min-w-0 flex-1 space-y-3">
            {/* Title + Type Badge */}
            <div className="space-y-1">
              <h3 className="font-semibold text-lg truncate">{ev.title}</h3>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  {EVENT_TYPE_LABEL[ev.event_type] || ev.event_type}
                </Badge>
                {ev.group && (
                  <Badge variant="outline" className="capitalize">
                    {String(ev.group).toLowerCase()}
                  </Badge>
                )}
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
            <div className="flex flex-wrap gap-3 text-sm">
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

          {/* Right: Actions */}
          <div className="flex flex-col gap-1.5 shrink-0">
            <Button
              variant="default"
              size="sm"
              asChild
            >
              <a href={`${p.detailPagePath || '/admin/events'}/${ev.event_id}`}>
                <ExternalLink className="h-4 w-4 mr-1.5" />
                Open
              </a>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={p.onOpenWhatsApp}
            >
              <MessageCircle className="h-4 w-4 mr-1.5" />
              WhatsApp
            </Button>

            {!isPast && (
              <>
                <Separator className="my-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={p.onEdit}
                >
                  <Pencil className="h-4 w-4 mr-1.5" />
                  Edit
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={p.onDelete}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Delete
                </Button>
              </>
            )}
          </div>
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
