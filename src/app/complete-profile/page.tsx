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
import { Loader2, Search, X, Info } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { firebaseAuth } from "@/lib/firebaseClient";

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
  const [isDuplicateEmail, setIsDuplicateEmail] = useState(false);
  const [formData, setFormData] = useState({
    groups: [] as string[],
    member_type: "",
    phone: "",
    yearOfBirth: "",
    monthOfBirth: "", // 1–12 as string
    gender: "",
    hasPaymentManager: false,
    paymentManagerId: "",
    paymentManagerName: "",
  });

  // Parent search state
  const [parentSearch, setParentSearch] = useState("");
  const [parentOptions, setParentOptions] = useState<ParentOption[]>([]);
  const [searchingParents, setSearchingParents] = useState(false);
  const [showParentDropdown, setShowParentDropdown] = useState(false);

  // Prevent hydration mismatch by only rendering after client mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate age (month-accurate) and determine if payment manager is needed
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-based
  const userAge = formData.yearOfBirth
    ? formData.monthOfBirth
      ? currentYear - parseInt(formData.yearOfBirth) - (currentMonth < parseInt(formData.monthOfBirth) ? 1 : 0)
      : currentYear - parseInt(formData.yearOfBirth)
    : null;
  const isUnder18 = userAge !== null && userAge < 18;
  const showPaymentManager = isUnder18;

  // ── Group eligibility rules ────────────────────────────────────────────────
  // Exactly one group is assigned per player based on age + gender.
  // All other groups are ineligible — admins can add extras later.
  function getGroupEligibility(age: number | null, gender: string): {
    eligible: string[];
    suggested: string[];
    reason: Record<string, string>;
  } {
    const allGroups = ["Men", "Women", "U-13", "U-15", "U-18"];
    const reason: Record<string, string> = {};

    if (age === null) {
      // Age not yet known — nothing selectable
      allGroups.forEach(g => { reason[g] = "Select your date of birth first"; });
      return { eligible: [], suggested: [], reason };
    }

    if (age >= 18) {
      if (!gender) {
        // Gender required to determine adult group
        allGroups.forEach(g => { reason[g] = "Select your gender to determine your group"; });
        return { eligible: [], suggested: [], reason };
      }
      const assignedGroup = gender === "Female" ? "Women" : "Men";
      allGroups
        .filter(g => g !== assignedGroup)
        .forEach(g => { reason[g] = "Admin can add additional groups if needed"; });
      return { eligible: [assignedGroup], suggested: [assignedGroup], reason };
    }

    // Under 18 — single age-bracket group assigned automatically
    reason["Men"] = "Must be 18+ to join Men";
    reason["Women"] = "Must be 18+ to join Women";

    let assignedGroup: string;
    if (age <= 13) {
      assignedGroup = "U-13";
    } else if (age <= 15) {
      assignedGroup = "U-15";
    } else {
      assignedGroup = "U-18"; // age 16–17
    }

    ["U-13", "U-15", "U-18"]
      .filter(g => g !== assignedGroup)
      .forEach(g => { reason[g] = "Admin can add additional groups if needed"; });

    return { eligible: [assignedGroup], suggested: [assignedGroup], reason };
  }

  const { eligible: eligibleGroups, suggested: suggestedGroups, reason: ineligibleReason } =
    getGroupEligibility(userAge, formData.gender);

  // Auto-suggest: when age or gender changes, apply suggested groups (remove
  // any now-ineligible ones and add missing suggestions).
  useEffect(() => {
    if (userAge === null) return;
    setFormData(prev => {
      const kept = prev.groups.filter(g => eligibleGroups.includes(g));
      const toAdd = suggestedGroups.filter(g => !kept.includes(g));
      const next = [...kept, ...toAdd];
      // Only update if something changed to avoid infinite loops
      if (next.length === prev.groups.length && next.every(g => prev.groups.includes(g))) {
        return prev;
      }
      return { ...prev, groups: next };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userAge, formData.gender]);

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
      setError("Please select your birth year");
      return;
    }
    if (!formData.monthOfBirth) {
      setError("Please select your birth month");
      return;
    }
    if (!formData.gender) {
      setError("Please select your gender");
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
    setIsDuplicateEmail(false);

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
          monthOfBirth: formData.monthOfBirth ? parseInt(formData.monthOfBirth) : null,
          gender: formData.gender,
          member_type: formData.member_type,
          phone: formData.phone,
          hasPaymentManager: formData.hasPaymentManager,
          paymentManagerId: formData.hasPaymentManager ? formData.paymentManagerId : null,
          paymentManagerName: formData.hasPaymentManager ? formData.paymentManagerName : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (response.status === 409 && data?.code === "duplicate_email") {
          setIsDuplicateEmail(true);
          setError(data.error || "An account with this email already exists.");
          setSubmitting(false);
          return;
        }
        throw new Error(data?.error || "Failed to submit profile");
      }

      const result = await response.json();

      // Success - redirect based on status
      if (result.status === "pending_parent_approval") {
        router.replace("/pending-approval?stage=parent");
      } else if (result.status === "pending_approval") {
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
        <Card className="shadow-lg border">
          <CardHeader className="items-center pb-4 pt-8">
            <div className="mb-4 flex justify-center">
              <ClubLogo size="xl" />
            </div>
            <CardTitle className="text-center text-xl">Complete Your Profile</CardTitle>
            <p className="text-sm text-muted-foreground text-center mt-1">
              Please provide the following details to continue
            </p>
          </CardHeader>
          <CardContent className="px-6 pb-8">
            <form onSubmit={handleSubmit} className="space-y-5">

              {/*  Date of Birth  */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date of Birth</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="monthOfBirth">
                      Month <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.monthOfBirth}
                      onValueChange={(value) => setFormData({ ...formData, monthOfBirth: value })}
                      required
                    >
                      <SelectTrigger id="monthOfBirth" className="w-full">
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent>
                        {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="yearOfBirth">
                        Year <span className="text-red-500">*</span>
                      </Label>
                      {userAge !== null && (
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          Age {userAge}
                        </span>
                      )}
                    </div>
                    <Select
                      value={formData.yearOfBirth}
                      onValueChange={(value) => setFormData({ ...formData, yearOfBirth: value })}
                      required
                    >
                      <SelectTrigger id="yearOfBirth" className="w-full">
                        <SelectValue placeholder="Year" />
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
                </div>
              </div>

              {/*  Identity  */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Identity</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="gender">
                      Gender <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.gender}
                      onValueChange={(value) => setFormData({ ...formData, gender: value })}
                      required
                    >
                      <SelectTrigger id="gender" className="w-full">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>
                      Groups <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {["Men", "Women", "U-13", "U-15", "U-18"].map((group) => {
                        const isEligible = eligibleGroups.includes(group);
                        const isSelected = formData.groups.includes(group);
                        const disabledReason = ineligibleReason[group];
                        return (
                          <span
                            key={group}
                            title={!isSelected ? (disabledReason ?? "Admin can add additional groups if needed") : "Your assigned group"}
                            className={[
                              "rounded-full border px-3 py-1 text-xs font-medium select-none",
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : isEligible
                                ? "border-border bg-background text-foreground opacity-50"
                                : "border-border bg-muted text-muted-foreground opacity-30",
                            ].join(" ")}
                          >
                            {group}
                          </span>
                        );
                      })}
                    </div>
                    {userAge === null && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Info className="h-3 w-3 shrink-0" />
                        Select your date of birth first
                      </p>
                    )}
                    {userAge !== null && !isUnder18 && !formData.gender && (
                      <p className="flex items-center gap-1 text-xs text-amber-600">
                        <Info className="h-3 w-3 shrink-0" />
                        Select your gender to determine your group
                      </p>
                    )}
                    {userAge !== null && isUnder18 && (
                      <p className="flex items-center gap-1 text-xs text-blue-600">
                        <Info className="h-3 w-3 shrink-0" />
                        Group assigned based on your age ({userAge})
                      </p>
                    )}
                    {userAge !== null && !isUnder18 && formData.gender && (
                      <p className="flex items-center gap-1 text-xs text-emerald-600">
                        <Info className="h-3 w-3 shrink-0" />
                        Group assigned based on your gender
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/*  Payment Manager (Conditional)  */}
              {showPaymentManager && (
                <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hasPaymentManager"
                      checked={formData.hasPaymentManager}
                      onCheckedChange={(checked) => {
                        if (!checked) {
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
                    <Label htmlFor="hasPaymentManager" className="cursor-pointer text-sm">
                      Do you have a Payment Manager (Parent/Guardian)?
                    </Label>
                  </div>

                  {formData.hasPaymentManager && (
                    <div className="space-y-2">
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
                            <Button type="button" variant="ghost" size="sm" onClick={clearParent}>
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        {showParentDropdown && !formData.paymentManagerId && parentOptions.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                            {parentOptions.map((parent) => (
                              <button
                                key={parent.player_id}
                                type="button"
                                className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                                onClick={() => selectParent(parent)}
                              >
                                <div className="font-medium text-sm">{parent.name}</div>
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
                        <div className="flex items-center gap-2 p-2.5 bg-green-50 border border-green-200 rounded-md">
                          <Badge variant="default" className="bg-green-600 shrink-0">Selected</Badge>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{formData.paymentManagerName}</div>
                            <div className="text-xs text-muted-foreground">Payment Manager</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/*  Membership  */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Membership</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
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
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="student">Student (25% off)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
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
              </div>

              {/*  Error  */}
              {isDuplicateEmail ? (
                <div className="bg-orange-50 border border-orange-300 rounded-lg p-4 space-y-1">
                  <p className="text-sm font-semibold text-orange-800">Account already exists</p>
                  <p className="text-sm text-orange-700">{error}</p>
                  <p className="text-xs text-orange-600 mt-1">
                    Try signing in with your original account, or contact an admin if you need help.
                  </p>
                </div>
              ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              {/*  Submit  */}
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

              <p className="text-xs text-muted-foreground text-center">
                All fields are required to access the app
              </p>
            </form>          </CardContent>
        </Card>
      </div>
    </div>
  );
}