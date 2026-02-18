"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Pencil, User, Calendar, Save } from "lucide-react";
import { VALIDATION_MESSAGES, VALIDATION_RULES } from "../constants";
import type { EnhancedKidProfile, UpdateKidInput } from "../types";

type EditKidModalProps = {
  open: boolean;
  kid: EnhancedKidProfile | null;
  onClose: () => void;
  onSubmit: (input: UpdateKidInput) => Promise<void>;
  isLoading?: boolean;
  error?: string;
};

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1990 + 1 }, (_, i) => currentYear - i);

export function EditKidModal(p: EditKidModalProps) {
  const [name, setName] = useState("");
  const [yearOfBirth, setYearOfBirth] = useState("");
  const [monthOfBirth, setMonthOfBirth] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState(p.error);

  useEffect(() => {
    if (p.open && p.kid) {
      setName(p.kid.name);
      setYearOfBirth(String(p.kid.yearOfBirth ?? ""));
      setMonthOfBirth(String(p.kid.monthOfBirth ?? ""));
      setErrors({});
      setSubmitError("");
    }
  }, [p.open, p.kid]);

  if (!p.kid) return null;

  const hasChanges =
    name !== p.kid.name ||
    yearOfBirth !== String(p.kid.yearOfBirth ?? "") ||
    monthOfBirth !== String(p.kid.monthOfBirth ?? "");

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (name && name.length > VALIDATION_RULES.NAME_MAX) {
      newErrors.name = VALIDATION_MESSAGES.NAME_TOO_LONG;
    }
    if (yearOfBirth && monthOfBirth) {
      const y = Number(yearOfBirth);
      const m = Number(monthOfBirth);
      if (!Number.isInteger(y) || y < 1990 || y > currentYear) {
        newErrors.yearOfBirth = VALIDATION_MESSAGES.YEAR_INVALID;
      } else if (!Number.isInteger(m) || m < 1 || m > 12) {
        newErrors.monthOfBirth = VALIDATION_MESSAGES.MONTH_INVALID;
      } else {
        const now = new Date();
        if (y > now.getFullYear() || (y === now.getFullYear() && m > now.getMonth() + 1)) {
          newErrors.yearOfBirth = VALIDATION_MESSAGES.DOB_FUTURE;
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(undefined);
    if (!validateForm() || !p.kid) return;

    const input: UpdateKidInput = {};
    if (name !== p.kid.name) input.name = name.trim();
    if (yearOfBirth !== String(p.kid.yearOfBirth ?? "")) input.yearOfBirth = Number(yearOfBirth);
    if (monthOfBirth !== String(p.kid.monthOfBirth ?? "")) input.monthOfBirth = Number(monthOfBirth);

    try {
      await p.onSubmit(input);
    } catch (e: any) {
      setSubmitError(String(e?.message || e));
    }
  };

  const monthLabel = MONTHS.find((m) => m.value === Number(monthOfBirth))?.label ?? "—";

  return (
    <Dialog open={p.open} onOpenChange={(isOpen) => !isOpen && p.onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            Edit Kid Profile
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            ID: {p.kid.kid_id.slice(0, 8)}...
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Kid Name
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          {/* Birth Month + Year */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Month &amp; Year of Birth
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Select value={monthOfBirth} onValueChange={setMonthOfBirth}>
                  <SelectTrigger className={errors.monthOfBirth ? "border-destructive" : ""}>
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => (
                      <SelectItem key={m.value} value={String(m.value)}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.monthOfBirth && <p className="text-xs text-destructive mt-1">{errors.monthOfBirth}</p>}
              </div>
              <div>
                <Select value={yearOfBirth} onValueChange={setYearOfBirth}>
                  <SelectTrigger className={errors.yearOfBirth ? "border-destructive" : ""}>
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.yearOfBirth && <p className="text-xs text-destructive mt-1">{errors.yearOfBirth}</p>}
              </div>
            </div>
          </div>

          {/* Read-only Info */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={p.kid.status === "active" ? "default" : "outline"}>
                  {p.kid.status === "active" ? "Active" : "Deleted"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Parents:</span>
                <span className="font-medium text-right">{p.kid.parent_emails.join(", ")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Created:</span>
                <span className="font-medium">{new Date(p.kid.created_at).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>

          {submitError && (
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{submitError}</p>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={p.onClose} disabled={p.isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={p.isLoading || !hasChanges}>
              {p.isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
