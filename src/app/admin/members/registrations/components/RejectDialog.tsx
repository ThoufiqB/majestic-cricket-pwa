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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle } from "lucide-react";
import type { RejectionReason } from "@/lib/types/auth";

type Props = {
  open: boolean;
  onClose: () => void;
  onReject: (reason: RejectionReason, notes?: string) => Promise<void>;
  requestName: string;
  requestEmail: string;
};

export function RejectDialog({ open, onClose, onReject, requestName, requestEmail }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState<RejectionReason>("incorrect_info");
  const [notes, setNotes] = useState("");

  async function handleReject() {
    setSubmitting(true);
    try {
      await onReject(reason, notes || undefined);
      onClose();
      setReason("incorrect_info");
      setNotes("");
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
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            Reject Registration
          </DialogTitle>
          <DialogDescription>
            Reject <strong>{requestName}</strong> ({requestEmail})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Rejection Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Rejection *</Label>
            <Select
              value={reason}
              onValueChange={(value) => setReason(value as RejectionReason)}
            >
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="incorrect_info">Incorrect information</SelectItem>
                <SelectItem value="incomplete">Incomplete phone number</SelectItem>
                <SelectItem value="wrong_group">Wrong group selection</SelectItem>
                <SelectItem value="duplicate">Duplicate account</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes for User (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="e.g., Please verify your group selection and resubmit"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <p className="font-medium">ℹ️ User can resubmit</p>
            <p className="text-xs mt-1">
              The user will be able to edit their information and submit a new request.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleReject} disabled={submitting}>
            {submitting ? "Rejecting..." : "Reject & Allow Retry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
