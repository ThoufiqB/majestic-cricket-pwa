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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronUp } from "lucide-react";

type ApprovalDetails = {
  group?: string;
  member_type?: string;
  phone?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onApprove: (details: ApprovalDetails) => Promise<void>;
  requestName: string;
  requestEmail: string;
};

export function ApproveDialog({ open, onClose, onApprove, requestName, requestEmail }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [details, setDetails] = useState<ApprovalDetails>({
    group: undefined,
    member_type: undefined,
    phone: "",
  });

  async function handleQuickApprove() {
    setSubmitting(true);
    try {
      // Quick approve with no details - user will complete profile later
      await onApprove({});
      onClose();
      // Reset form
      setDetails({ group: undefined, member_type: undefined, phone: "" });
      setShowDetails(false);
    } catch (e: any) {
      alert(e?.message || "Failed to approve request");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApproveWithDetails() {
    setSubmitting(true);
    try {
      // Filter out undefined/empty values before sending
      const cleanDetails: ApprovalDetails = {};
      if (details.group && details.group !== "none") cleanDetails.group = details.group;
      if (details.member_type && details.member_type !== "none") cleanDetails.member_type = details.member_type;
      if (details.phone) cleanDetails.phone = details.phone;
      
      await onApprove(cleanDetails);
      onClose();
      // Reset form
      setDetails({ group: undefined, member_type: undefined, phone: "" });
      setShowDetails(false);
    } catch (e: any) {
      alert(e?.message || "Failed to approve request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Approve Registration</DialogTitle>
          <DialogDescription>
            Approve <strong>{requestName}</strong> ({requestEmail})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Toggle button */}
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-between"
            onClick={() => setShowDetails(!showDetails)}
          >
            <span>Add details now (optional)</span>
            {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          {/* Collapsible details section */}
          {showDetails && (
            <div className="space-y-4 border-t pt-4">
              {/* Group */}
              <div className="space-y-2">
                <Label htmlFor="group">Group</Label>
                <Select
                  value={details.group || "none"}
                  onValueChange={(value) => setDetails({ ...details, group: value === "none" ? undefined : value })}
                >
                  <SelectTrigger id="group">
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not specified</SelectItem>
                    <SelectItem value="men">Men</SelectItem>
                    <SelectItem value="women">Women</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Member Type */}
              <div className="space-y-2">
                <Label htmlFor="member_type">Member Type</Label>
                <Select
                  value={details.member_type || "none"}
                  onValueChange={(value) => setDetails({ ...details, member_type: value === "none" ? undefined : value })}
                >
                  <SelectTrigger id="member_type">
                    <SelectValue placeholder="Select member type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not specified</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="student">Student (25% discount)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Phone number"
                  value={details.phone}
                  onChange={(e) => setDetails({ ...details, phone: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          {showDetails ? (
            <Button onClick={handleApproveWithDetails} disabled={submitting}>
              {submitting ? "Approving..." : "Approve with Details"}
            </Button>
          ) : (
            <Button onClick={handleQuickApprove} disabled={submitting}>
              {submitting ? "Approving..." : "Quick Approve"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
