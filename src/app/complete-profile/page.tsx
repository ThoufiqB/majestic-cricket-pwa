"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Loader2 } from "lucide-react";

export default function CompleteProfilePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    group: "",
    member_type: "",
    phone: "",
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
      const response = await fetch("/api/me/complete-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          group: formData.group,
          member_type: formData.member_type,
          phone: formData.phone,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to update profile");
      }

      // Success - redirect to home
      router.replace("/home");
    } catch (e: any) {
      console.error("Profile completion failed:", e);
      setError(e?.message || "Failed to complete profile. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <ClubLogo />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Complete Your Profile</CardTitle>
            <p className="text-sm text-gray-600 text-center mt-2">
              Please provide the following details to continue
            </p>
          </CardHeader>
          <CardContent>
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
                    Saving...
                  </>
                ) : (
                  "Complete Profile"
                )}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                All fields are required to access the app
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
