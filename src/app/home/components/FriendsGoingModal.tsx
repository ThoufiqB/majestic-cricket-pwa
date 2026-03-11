"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, AlertCircle, Copy, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { apiGet } from "@/app/client/api";
import type { FriendsGoing } from "../types";

type Props = {
  openEventId: string | null;
  events: any[];
  onClose: () => void;
};

export function FriendsGoingModal({ openEventId, events, onClose }: Props) {
  const [cache, setCache] = useState<Record<string, FriendsGoing>>({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [copiedTab, setCopiedTab] = useState<string | null>(null);

  const ev = events.find((x: any) => x.event_id === openEventId);

  // Fetch data when a new event is opened (with internal cache)
  useEffect(() => {
    if (!openEventId) return;
    if (cache[openEventId]) return;

    setErr("");
    setLoading(true);
    apiGet(`/api/events/${encodeURIComponent(openEventId)}/attendees`)
      .then((data) => {
        setCache((prev) => ({ ...prev, [openEventId]: data as FriendsGoing }));
      })
      .catch((e: any) => setErr(String(e?.message || e)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openEventId]);

  const modalData = openEventId ? (cache[openEventId] ?? null) : null;
  const groupKeys = modalData ? Object.keys(modalData.groups) : [];
  const defaultTab = groupKeys[0] ?? "Absent";

  function copyNames(names: string[], tabKey: string) {
    if (!names.length) return;
    navigator.clipboard.writeText(names.join("\n")).then(() => {
      setCopiedTab(tabKey);
      setTimeout(() => setCopiedTab(null), 1200);
    });
  }

  return (
    <Dialog open={!!openEventId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Friends Going
          </DialogTitle>
          <DialogDescription asChild>
            <span>
              {ev?.title && (
                <span className="block mt-0.5 truncate font-medium text-foreground">
                  {ev.title}
                </span>
              )}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-[120px]">
          {loading && (
            <div className="space-y-3 pt-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          )}

          {!loading && err && (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm">{err}</p>
            </div>
          )}

          {!loading && !err && !modalData && (
            <p className="text-sm text-muted-foreground text-center py-6">No data yet.</p>
          )}

          {!loading && !err && modalData && (
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="w-full">
                {groupKeys.map((g) => (
                  <TabsTrigger key={g} value={g} className="flex-1 text-xs sm:text-sm">
                    {g} ({modalData.groups[g].yes})
                  </TabsTrigger>
                ))}
                <TabsTrigger value="Absent" className="flex-1 text-xs sm:text-sm">
                  Absent{modalData.absent.length > 0 ? ` (${modalData.absent.length})` : ""}
                </TabsTrigger>
              </TabsList>

              {/* Per-group tabs */}
              {groupKeys.map((g) => {
                const people = modalData.groups[g].people;
                return (
                  <TabsContent key={g} value={g} className="mt-4 focus-visible:outline-none">
                    <div className="flex justify-end mb-3">
                      <button
                        type="button"
                        disabled={people.length === 0}
                        onClick={() => copyNames(people.map((p) => p.name), g)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border border-muted-foreground/20 hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {copiedTab === g ? (
                          <><Check className="h-3 w-3" /> Copied!</>
                        ) : (
                          <><Copy className="h-3 w-3" /> Copy</>
                        )}
                      </button>
                    </div>
                    {people.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No one yet.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                        {people.map((person, idx) => (
                          <p key={`${person.player_id}-${idx}`} className="text-sm">
                            {person.name || person.player_id}
                          </p>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                );
              })}

              {/* Absent tab */}
              <TabsContent value="Absent" className="mt-4 focus-visible:outline-none">
                <div className="flex justify-end mb-3">
                  <button
                    type="button"
                    disabled={modalData.absent.length === 0}
                    onClick={() => copyNames(modalData.absent.map((p) => p.name), "Absent")}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border border-muted-foreground/20 hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {copiedTab === "Absent" ? (
                      <><Check className="h-3 w-3" /> Copied!</>
                    ) : (
                      <><Copy className="h-3 w-3" /> Copy</>
                    )}
                  </button>
                </div>
                {modalData.absent.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No one yet.</p>
                ) : (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {modalData.absent.map((person, idx) => (
                      <p key={`${person.player_id}-${idx}`} className="text-sm">
                        {person.name || person.player_id}
                      </p>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

