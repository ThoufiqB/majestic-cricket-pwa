"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertTriangle, Trash2, Info } from "lucide-react";
import type { EnhancedKidProfile } from "../types";

type DeactivateKidModalProps = {
  open: boolean;
  kid: EnhancedKidProfile | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
};

export function DeactivateKidModal(p: DeactivateKidModalProps) {
  if (!p.kid) return null;

  return (
    <Dialog open={p.open} onOpenChange={(isOpen) => !isOpen && p.onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Kid Profile?
          </DialogTitle>
          <DialogDescription>
            This action can be reversed later if needed.
          </DialogDescription>
        </DialogHeader>

        {/* Kid Info */}
        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="pt-4 space-y-3">
            <p className="text-sm font-medium">This will deactivate:</p>
            <p className="text-lg font-bold">
              {p.kid.name} <span className="text-muted-foreground font-normal">(Age {p.kid.age})</span>
            </p>

            <div className="text-sm">
              <p className="font-medium">Parents affected:</p>
              <ul className="ml-4 mt-1 text-muted-foreground">
                {p.kid.parent_emails.map((email, idx) => (
                  <li key={idx}>• {email}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* What happens */}
        <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900 dark:text-amber-100">
                <p className="font-semibold">What happens:</p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-amber-800 dark:text-amber-200">
                  <li>Kid will not appear in parents' profile list</li>
                  <li>All attendance records marked as deleted</li>
                  <li>Can be restored later</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={p.onClose}
            disabled={p.isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={p.onConfirm}
            disabled={p.isLoading}
          >
            {p.isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
