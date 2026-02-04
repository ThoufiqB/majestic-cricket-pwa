"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  open: boolean;
  onClose: () => void;
  onReject: (reason: string) => Promise<void>;
  requestName: string;
  requestEmail: string;
};

export function RejectDialog({ open, onClose, onReject, requestName, requestEmail }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState("");

  async function handleReject() {
    setSubmitting(true);
    try {
      await onReject(reason);
      onClose();
      setReason("");
    } catch (e: any) {
      alert(e?.message || "Failed to reject request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Reject Registration</DialogTitle>
          <DialogDescription>
            Reject <strong>{requestName}</strong> ({requestEmail})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Rejection (Optional)</Label>
            <Input
              id="reason"
              placeholder="e.g., Not a club member"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <p className="text-sm text-gray-500">
            The user will be able to request access again in the future.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleReject} disabled={submitting}>
            {submitting ? "Rejecting..." : "Reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
