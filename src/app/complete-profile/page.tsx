"use client";

import { useState, useEffect } from "react";
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
import { Loader2, Search, X, ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { firebaseAuth } from "@/lib/firebaseClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ParentOption {
  player_id: string;
  name: string;
  email: string;
}

export default function CompleteProfilePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    groups: [] as string[],
    member_type: "",
    phone: "",
    yearOfBirth: "",
    hasPaymentManager: false,
    paymentManagerId: "",
    paymentManagerName: "",
  });

  // Parent search state
  const [parentSearch, setParentSearch] = useState("");
  const [parentOptions, setParentOptions] = useState<ParentOption[]>([]);
  const [searchingParents, setSearchingParents] = useState(false);
  const [showParentDropdown, setShowParentDropdown] = useState(false);
  const [groupsDropdownOpen, setGroupsDropdownOpen] = useState(false);

  // Prevent hydration mismatch by only rendering after client mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate age and determine if payment manager is needed
  const currentYear = new Date().getFullYear();
  const userAge = formData.yearOfBirth ? currentYear - parseInt(formData.yearOfBirth) : null;
  const isUnder18 = userAge !== null && userAge < 18;
  const showPaymentManager = isUnder18; // Only show for youth under 18

  // Auto-set membership type for youth with payment manager
  useEffect(() => {
    if (formData.hasPaymentManager && formData.member_type !== "student") {
      setFormData(prev => ({ ...prev, member_type: "student" }));
    }
  }, [formData.hasPaymentManager]);

  // Clear payment manager when user becomes adult (age >= 18)
  useEffect(() => {
    if (!isUnder18 && formData.hasPaymentManager) {
      setFormData(prev => ({
        ...prev,
        hasPaymentManager: false,
        paymentManagerId: "",
        paymentManagerName: "",
      }));
      setParentSearch("");
    }
  }, [isUnder18, formData.hasPaymentManager]);

  // Search for parents
  useEffect(() => {
    if (parentSearch.length < 2) {
      setParentOptions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingParents(true);
      try {
        const response = await fetch(`/api/users/search?name=${encodeURIComponent(parentSearch)}`);
        if (response.ok) {
          const data = await response.json();
          setParentOptions(data.users || []);
        }
      } catch (e) {
        console.error("Failed to search parents:", e);
      } finally {
        setSearchingParents(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [parentSearch]);

  function toggleGroup(group: string) {
    setFormData(prev => ({
      ...prev,
      groups: prev.groups.includes(group)
        ? prev.groups.filter(g => g !== group)
        : [...prev.groups, group],
    }));
  }

  function selectParent(parent: ParentOption) {
    setFormData(prev => ({
      ...prev,
      paymentManagerId: parent.player_id,
      paymentManagerName: parent.name,
    }));
    setParentSearch(parent.name);
    setShowParentDropdown(false);
  }

  function clearParent() {
    setFormData(prev => ({
      ...prev,
      paymentManagerId: "",
      paymentManagerName: "",
    }));
    setParentSearch("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Validation
    if (formData.groups.length === 0) {
      setError("Please select at least one group");
      return;
    }
    if (!formData.yearOfBirth) {
      setError("Please select your year of birth");
      return;
    }
    if (!formData.member_type || formData.member_type === "none") {
      setError("Please select your member type");
      return;
    }
    if (!formData.phone || formData.phone.trim() === "") {
      setError("Please enter your phone number");
      return;
    }

    // Validation: Adults must select at least one adult category
    if (!isUnder18 && userAge !== null) {
      const hasAdultCategory = formData.groups.includes("Men") || formData.groups.includes("Women");
      if (!hasAdultCategory) {
        setError("Adults must select at least one adult category (Men or Women). You can also add youth groups if you're coaching or tracking events.");
        return;
      }
    }

    // Validation: Under 18 must have payment manager
    if (isUnder18 && !formData.hasPaymentManager) {
      setError("Players under 18 must have a payment manager (parent/guardian)");
      return;
    }

    // Validation: If payment manager selected, must choose a parent
    if (formData.hasPaymentManager && !formData.paymentManagerId) {
      setError("Please search and select your parent/guardian");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // Get ID token from Firebase to authenticate API call (user may not have session yet)
      const idToken = await firebaseAuth.currentUser?.getIdToken();

      if (!idToken) {
        throw new Error("Authentication required. Please sign in again.");
      }

      const response = await fetch("/api/me/complete-profile", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          groups: formData.groups,
          yearOfBirth: parseInt(formData.yearOfBirth),
          member_type: formData.member_type,
          phone: formData.phone,
          hasPaymentManager: formData.hasPaymentManager,
          paymentManagerId: formData.hasPaymentManager ? formData.paymentManagerId : null,
          paymentManagerName: formData.hasPaymentManager ? formData.paymentManagerName : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to submit profile");
      }

      const result = await response.json();
      
      // Success - redirect to pending approval page
      if (result.status === "pending_approval") {
        router.replace("/pending-approval");
      } else {
        router.replace("/home");
      }
    } catch (e: any) {
      console.error("Profile completion failed:", e);
      setError(e?.message || "Failed to complete profile. Please try again.");
      setSubmitting(false);
    }
  }

  // Show loading state during hydration to prevent mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <ClubLogo />
          </div>
          <Card className="shadow-lg border">
            <CardContent className="p-4 md:p-6 flex items-center justify-center min-h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <ClubLogo />
        </div>

        <Card className="shadow-lg border">
          <CardHeader>
            <CardTitle className="text-center">Complete Your Profile</CardTitle>
            <p className="text-sm text-gray-600 text-center mt-2">
              Please provide the following details to continue
            </p>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Year of Birth and Groups - 2 Column Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Year of Birth */}
                <div className="space-y-2">
                  <Label htmlFor="yearOfBirth" className="flex items-center gap-2">
                    <span>Year of Birth <span className="text-red-500">*</span></span>
                    {userAge !== null && (
                      <span className="text-xs text-muted-foreground font-normal">
                        (Age: {userAge})
                      </span>
                    )}
                  </Label>
                  <Select
                    value={formData.yearOfBirth}
                    onValueChange={(value) => setFormData({ ...formData, yearOfBirth: value })}
                    required
                  >
                    <SelectTrigger id="yearOfBirth" className="w-full">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: currentYear - 1970 + 1 }, (_, i) => currentYear - i).map((year) => (
                        <SelectItem key={year} value={String(year)}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Groups (Dropdown with Checkboxes) */}
                <div className="space-y-2">
                  <Label>
                    Groups <span className="text-red-500">*</span>
                  </Label>
                  <DropdownMenu open={groupsDropdownOpen} onOpenChange={setGroupsDropdownOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between"
                      >
                        <span className="truncate">
                          {formData.groups.length === 0
                            ? "Select groups"
                            : formData.groups.length === 1
                            ? formData.groups[0]
                            : `${formData.groups.length} selected`}
                        </span>
                        <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 p-3" align="start">
                      <div className="space-y-2">
                        {["Men", "Women", "U-13", "U-15", "U-18"].map((group) => (
                          <div key={group} className="flex items-center space-x-2">
                            <Checkbox
                              id={`group-${group}`}
                              checked={formData.groups.includes(group)}
                              onCheckedChange={() => toggleGroup(group)}
                            />
                            <label
                              htmlFor={`group-${group}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                            >
                              {group}
                            </label>
                          </div>
                        ))}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {formData.groups.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {formData.groups.map(group => (
                        <Badge key={group} variant="secondary" className="text-xs">{group}</Badge>
                      ))}
                    </div>
                  )}
                  {userAge !== null && !isUnder18 && (
                    <p className="text-xs text-amber-600 font-medium">
                      ⚠️ Select at least one adult category (Men or Women)
                    </p>
                  )}
                </div>
              </div>

              {/* Payment Manager Section (Conditional) */}
              {showPaymentManager && (
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hasPaymentManager"
                      checked={formData.hasPaymentManager}
                      onCheckedChange={(checked) => {
                        if (!checked) {
                          // Validate age before allowing "No"
                          if (isUnder18) {
                            setError("Players under 18 must have a payment manager");
                            return;
                          }
                          clearParent();
                        }
                        setFormData(prev => ({ ...prev, hasPaymentManager: !!checked }));
                        setError("");
                      }}
                    />
                    <Label htmlFor="hasPaymentManager" className="cursor-pointer">
                      Do you have a Payment Manager (Parent/Guardian)?
                    </Label>
                  </div>

                  {formData.hasPaymentManager && (
                    <div className="space-y-2 pl-6">
                      <Label htmlFor="parentSearch">
                        Search for your Parent/Guardian <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="parentSearch"
                              type="text"
                              placeholder="Type parent's name..."
                              className="pl-9"
                              value={parentSearch}
                              onChange={(e) => {
                                setParentSearch(e.target.value);
                                setShowParentDropdown(true);
                              }}
                              onFocus={() => setShowParentDropdown(true)}
                              disabled={!!formData.paymentManagerId}
                            />
                            {searchingParents && (
                              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                          </div>
                          {formData.paymentManagerId && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={clearParent}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        {/* Parent Dropdown */}
                        {showParentDropdown && !formData.paymentManagerId && parentOptions.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                            {parentOptions.map((parent) => (
                              <button
                                key={parent.player_id}
                                type="button"
                                className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                                onClick={() => selectParent(parent)}
                              >
                                <div className="font-medium">{parent.name}</div>
                                <div className="text-xs text-muted-foreground">{parent.email}</div>
                              </button>
                            ))}
                          </div>
                        )}

                        {showParentDropdown && !formData.paymentManagerId && parentSearch.length >= 2 && !searchingParents && parentOptions.length === 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg p-3 text-sm text-muted-foreground">
                            No parents found. They must register first.
                          </div>
                        )}
                      </div>

                      {formData.paymentManagerId && (
                        <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-md">
                          <Badge variant="default" className="bg-green-600">Selected</Badge>
                          <div className="flex-1">
                            <div className="font-medium text-sm">{formData.paymentManagerName}</div>
                            <div className="text-xs text-muted-foreground">Payment Manager</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Member Type and Phone Number - 2 Column Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Member Type */}
                <div className="space-y-2">
                  <Label htmlFor="member_type">
                    Member Type <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.member_type}
                    onValueChange={(value) => setFormData({ ...formData, member_type: value })}
                    required
                    disabled={formData.hasPaymentManager}
                  >
                    <SelectTrigger id="member_type" className="w-full">
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
                    placeholder="07700 909000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
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
