"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Calendar, 
  Mail, 
  Pencil, 
  UserPlus, 
  Trash2, 
  RotateCcw,
  CalendarDays
} from "lucide-react";
import type { EnhancedKidProfile } from "../types";

type KidCardProps = {
  kid: EnhancedKidProfile;
  onEdit: () => void;
  onLinkParent: () => void;
  onDelete: () => void;
  onReactivate: () => void;
};

export function KidCard(p: KidCardProps) {
  const kid = p.kid;
  const isInactive = kid.status === "inactive";

  return (
    <Card className={`transition-all ${isInactive ? "opacity-60 bg-muted/30" : "hover:shadow-md"}`}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-4">
          {/* Info */}
          <div className="min-w-0 flex-1 space-y-3">
            {/* Name + Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                {kid.name}
              </h3>
              <Badge variant={isInactive ? "outline" : "default"} className={isInactive ? "text-muted-foreground" : ""}>
                {isInactive ? "Deleted" : "Active"}
              </Badge>
              <Badge variant="secondary">
                Age {kid.age}
              </Badge>
            </div>

            {/* Details */}
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>DOB: <span className="font-medium text-foreground">{kid.date_of_birth}</span></span>
              </div>

              <div className="flex items-start gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 mt-0.5" />
                <div>
                  <span>Parents:</span>
                  <div className="font-medium text-foreground">
                    {kid.parent_emails.map((email, idx) => (
                      <div key={idx}>{email}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>Created by {kid.created_by}</span>
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {new Date(kid.created_at).toLocaleDateString()}
              </span>
              <Badge variant="outline" className="text-xs">
                {kid.event_count} event{kid.event_count !== 1 ? "s" : ""}
              </Badge>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1.5 shrink-0">
            {!isInactive ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={p.onEdit}
                  className="justify-start"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={p.onLinkParent}
                  className="justify-start"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Link Parent
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={p.onDelete}
                  className="justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={p.onReactivate}
                className="justify-start text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restore
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
