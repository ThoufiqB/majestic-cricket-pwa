"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClubLogo } from "@/components/ClubLogo";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";

type Props = {
  rejectionReason?: string;
  rejectionNotes?: string;
  previousData?: {
    group?: string;
    member_type?: string;
    phone?: string;
  };
  onBack: () => void;
  onSuccess: () => void;
};

const REJECTION_REASON_LABELS: Record<string, string> = {
  incorrect_info: "Incorrect information",
  incomplete: "Incomplete phone number",
  wrong_group: "Wrong group selection",
  duplicate: "Duplicate account",
  other: "Other",
};

export function ResubmitForm({
  rejectionReason,
  rejectionNotes,
  previousData,
  onBack,
  onSuccess,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    group: previousData?.group || "",
    member_type: previousData?.member_type || "",
    phone: previousData?.phone || "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validation
    if (!formData.group || formData.group === "none") {
      setError("Please select your group");
      return;
    }
    if (!formData.member_type || formData.member_type === "none") {
      setError("Please select your member type (student = 25% discount)");
      return;
    }
    if (!formData.phone || formData.phone.trim() === "") {
      setError("Please enter your phone number");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // Import firebaseAuth dynamically to get current user
      const { firebaseAuth } = await import("@/lib/firebaseClient");
      const currentUser = firebaseAuth.currentUser;
      
      if (!currentUser) {
        throw new Error("Not authenticated. Please sign in again.");
      }

      const idToken = await currentUser.getIdToken();

      const response = await fetch("/api/auth/resubmit-registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        credentials: "include",
        body: JSON.stringify({
          group: formData.group,
          member_type: formData.member_type,
          phone: formData.phone,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to resubmit registration");
      }

      // Success - show pending approval message by going back
      alert("Registration resubmitted successfully! Please wait for admin approval.");
      onBack();
    } catch (e: any) {
      console.error("Resubmission failed:", e);
      setError(e?.message || "Failed to resubmit registration. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack} size="sm">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Sign In
      </Button>

      <Card className="border-orange-200">
        <CardHeader className="bg-orange-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div className="flex-1">
              <CardTitle className="text-orange-900 text-base">
                Registration Request Rejected
              </CardTitle>
              {rejectionReason && (
                <p className="text-sm text-orange-700 mt-1">
                  <strong>Reason:</strong> {REJECTION_REASON_LABELS[rejectionReason] || rejectionReason}
                </p>
              )}
              {rejectionNotes && (
                <p className="text-sm text-orange-700 mt-2 whitespace-pre-wrap">
                  <strong>Admin Notes:</strong> {rejectionNotes}
                </p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="text-sm text-gray-600 mb-4">
            Please correct the issues below and resubmit your registration request.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Group */}
            <div className="space-y-2">
              <Label htmlFor="group">
                Group <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.group}
                onValueChange={(value) => setFormData({ ...formData, group: value })}
                required
              >
                <SelectTrigger id="group">
                  <SelectValue placeholder="Select your group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="men">Men</SelectItem>
                  <SelectItem value="women">Women</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Member Type */}
            <div className="space-y-2">
              <Label htmlFor="member_type">
                Member Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.member_type}
                onValueChange={(value) => setFormData({ ...formData, member_type: value })}
                required
              >
                <SelectTrigger id="member_type">
                  <SelectValue placeholder="Select member type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="student">Student (25% discount)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">
                Phone Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1234567890"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resubmitting...
                </>
              ) : (
                "Resubmit Registration"
              )}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              Your corrected registration will be reviewed by an admin
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
