"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, AlertCircle, Copy as CopyIcon } from "lucide-react";
import { useState } from "react";
import type { FriendsGoing, HomeEvent } from "../types";

type Props = {
  openEventId: string | null;

  me: any;
  events: HomeEvent[];
  modalData: FriendsGoing | null;

  loading: boolean;
  err: string;

  onClose: () => void;
};

type GroupKey = "men" | "women" | "kids";

function safeGroupBlock(modalData: FriendsGoing | null | undefined, g: GroupKey) {
  const b: any = modalData ? (modalData as any)[g] : null;

  const yes = Number(b?.yes ?? 0);
  const total = Number(b?.total ?? 0);

  const peopleRaw = b?.people;
  const people: { player_id: string; name: string }[] = Array.isArray(peopleRaw)
    ? peopleRaw
        .map((x: any) => ({
          player_id: String(x?.player_id || ""),
          name: String(x?.name || ""),
        }))
        .filter((x) => x.player_id || x.name)
    : [];

  return {
    yes: Number.isFinite(yes) ? yes : 0,
    total: Number.isFinite(total) ? total : 0,
    people,
  };
}

export function FriendsGoingModal(p: Props) {
  const isOpen = !!p.openEventId;

  const playerGroup = String(p.me?.group || "").trim().toLowerCase();
  const isAdminLocal = String(p.me?.role || "").toLowerCase() === "admin";

  const ev = p.events.find((x) => x.event_id === p.openEventId);
  const evGroup = String(ev?.group || "").trim().toLowerCase();
  const isKidsEvent = ev?.kids_event === true;

  let groupsToShow: GroupKey[] = ["men", "women"];

  if (isKidsEvent) {
    groupsToShow = ["kids"];
  } else {
    if (!isAdminLocal) {
      if (evGroup === "mixed") groupsToShow = ["men", "women"];
      else if (playerGroup === "men" || playerGroup === "women") groupsToShow = [playerGroup as GroupKey];
      else groupsToShow = ["men"];
    } else {
      if (evGroup === "men" || evGroup === "women") groupsToShow = [evGroup as GroupKey];
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && p.onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Friends Going
          </DialogTitle>
          <DialogDescription>
            People who marked YES (active players only)
            {ev?.title && (
              <span className="block mt-1 truncate font-medium text-foreground">
                {ev.title}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {p.loading && (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          )}

          {!p.loading && p.err && (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm">{p.err}</p>
            </div>
          )}

          {!p.loading && !p.err && !p.modalData && (
            <p className="text-sm text-muted-foreground text-center py-4">No data yet.</p>
          )}

          {!p.loading && !p.err && p.modalData && (
            <div className="space-y-4">
              {groupsToShow.map((g) => {
                const block = safeGroupBlock(p.modalData, g);
                const pct = block.total > 0 ? (block.yes / block.total) * 100 : 0;
                const displayName = g === "kids" ? "Kids" : g.charAt(0).toUpperCase() + g.slice(1);

                // Phase 1: Copy badge state
                const [copiedGroup, setCopiedGroup] = useState<string | null>(null);

                // Handler to copy names
                const handleCopy = (names: string[], groupKey: string) => {
                  if (!names.length) return;
                  const text = names.join("\n");
                  navigator.clipboard.writeText(text).then(() => {
                    setCopiedGroup(groupKey);
                    setTimeout(() => setCopiedGroup(null), 1200);
                  });
                };

                return (
                  <div key={g} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{displayName}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {block.yes}/{block.total}
                        </Badge>
                        {block.people.length > 0 && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs font-medium border border-muted-foreground/20 hover:bg-muted-foreground/10 transition-colors focus:outline-none"
                            title="Copy names"
                            onClick={() => handleCopy(block.people.map(p => p.name).filter(Boolean), g)}
                          >
                            <CopyIcon className="h-3 w-3" />
                            {copiedGroup === g ? "Copied!" : "Copy"}
                          </button>
                        )}
                      </div>
                    </div>

                    <Progress value={pct} className="h-2" />

                    <div>
                      {block.people.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No one yet.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {block.people.map((person, idx) => {
                            const label = person.name || person.player_id || "Unknown";
                            return (
                              <Badge
                                key={`${person.player_id || label}-${idx}`}
                                variant="outline"
                                title={person.player_id}
                              >
                                {label}
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
