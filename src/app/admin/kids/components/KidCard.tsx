"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  User,
  Calendar,
  Mail,
  Pencil,
  UserPlus,
  Trash2,
  RotateCcw,
  CalendarDays,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
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
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Compact row */}
      <button onClick={() => setOpen(true)} className="w-full text-left">
        <Card
          className={`transition-all cursor-pointer ${
            isInactive
              ? "opacity-60 bg-muted/30"
              : "hover:shadow-md hover:bg-muted/30"
          }`}
        >
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-semibold text-primary">
                  {kid.name?.[0]?.toUpperCase() ?? "?"}
                </span>
              </div>

              {/* Name + DOB */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{kid.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  DOB: {kid.date_of_birth}
                </p>
              </div>

              {/* Age + Status + Chevron */}
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
                  Age {kid.age}
                </Badge>
                <Badge
                  variant={isInactive ? "outline" : "default"}
                  className={`text-xs ${isInactive ? "text-muted-foreground" : ""}`}
                >
                  {isInactive ? "Deleted" : "Active"}
                </Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </button>

      {/* Detail dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {kid.name}
            </DialogTitle>
            <DialogDescription>Junior profile details</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            {/* Status + Age */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant={isInactive ? "outline" : "default"}
                className={isInactive ? "text-muted-foreground" : ""}
              >
                {isInactive ? "Deleted" : "Active"}
              </Badge>
              <Badge variant="secondary">Age {kid.age}</Badge>
              <Badge variant="outline" className="text-xs">
                {kid.event_count} event{kid.event_count !== 1 ? "s" : ""}
              </Badge>
            </div>

            {/* Details */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Details
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span>
                    DOB:{" "}
                    <span className="font-medium text-foreground">
                      {kid.date_of_birth}
                    </span>
                  </span>
                </div>
                <div className="flex items-start gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <span>Parents:</span>
                    <div className="font-medium text-foreground">
                      {kid.parent_emails.length > 0 ? (
                        kid.parent_emails.map((email, idx) => (
                          <div key={idx}>{email}</div>
                        ))
                      ) : (
                        <span className="text-muted-foreground italic">
                          No parent linked
                        </span>
                      )}
                    </div>
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
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {!isInactive ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setOpen(false);
                      p.onEdit();
                    }}
                    className="flex-1"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setOpen(false);
                      p.onLinkParent();
                    }}
                    className="flex-1"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Link Parent
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setOpen(false);
                      p.onDelete();
                    }}
                    className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setOpen(false);
                    p.onReactivate();
                  }}
                  className="flex-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restore
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
