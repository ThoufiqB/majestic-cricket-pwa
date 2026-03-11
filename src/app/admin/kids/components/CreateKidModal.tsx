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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Baby, User, Calendar, Mail } from "lucide-react";
import { VALIDATION_MESSAGES, VALIDATION_RULES } from "../constants";
import type { CreateKidInput } from "../types";
import { apiGet } from "@/app/client/api";

type Parent = {
  player_id: string;
  email: string;
  name: string;
};

type CreateKidModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: CreateKidInput) => Promise<void>;
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

export function CreateKidModal(p: CreateKidModalProps) {
  const [parentEmail, setParentEmail] = useState("");
  const [name, setName] = useState("");
  const [yearOfBirth, setYearOfBirth] = useState("");
  const [monthOfBirth, setMonthOfBirth] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState(p.error);
  const [parents, setParents] = useState<Parent[]>([]);
  const [loadingParents, setLoadingParents] = useState(true);

  useEffect(() => {
    if (p.open) {
      setParentEmail("");
      setName("");
      setYearOfBirth("");
      setMonthOfBirth("");
      setErrors({});
      setSubmitError("");
    }
  }, [p.open]);

  useEffect(() => {
    const fetchParents = async () => {
      try {
        setLoadingParents(true);
        const data = await apiGet("/api/admin/parents/list");
        setParents(data.parents || []);
      } catch (e) {
        console.error("Failed to fetch parents:", e);
        setSubmitError("Failed to load parent list");
      } finally {
        setLoadingParents(false);
      }
    };
    if (p.open) fetchParents();
  }, [p.open]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!parentEmail.trim()) newErrors.parentEmail = VALIDATION_MESSAGES.PARENT_EMAIL_REQUIRED;
    if (!name.trim()) newErrors.name = VALIDATION_MESSAGES.NAME_REQUIRED;
    else if (name.length > VALIDATION_RULES.NAME_MAX) newErrors.name = VALIDATION_MESSAGES.NAME_TOO_LONG;
    if (!yearOfBirth) newErrors.yearOfBirth = VALIDATION_MESSAGES.YEAR_REQUIRED;
    if (!monthOfBirth) newErrors.monthOfBirth = VALIDATION_MESSAGES.MONTH_REQUIRED;
    if (yearOfBirth && monthOfBirth) {
      const y = Number(yearOfBirth);
      const m = Number(monthOfBirth);
      const now = new Date();
      if (y > now.getFullYear() || (y === now.getFullYear() && m > now.getMonth() + 1)) {
        newErrors.yearOfBirth = VALIDATION_MESSAGES.DOB_FUTURE;
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(undefined);
    if (!validateForm()) return;
    try {
      await p.onSubmit({
        parent_email: parentEmail.toLowerCase().trim(),
        name: name.trim(),
        yearOfBirth: Number(yearOfBirth),
        monthOfBirth: Number(monthOfBirth),
      });
    } catch (e: any) {
      setSubmitError(String(e?.message || e));
    }
  };

  return (
    <Dialog open={p.open} onOpenChange={(isOpen) => !isOpen && p.onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Baby className="h-5 w-5 text-primary" />
            Create Kid Profile
          </DialogTitle>
          <DialogDescription>
            Add a new child to the system. They will be linked to the selected parent.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Parent Email */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Parent Email *
            </Label>
            {loadingParents ? (
              <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Loading parents...</span>
              </div>
            ) : (
              <Select value={parentEmail} onValueChange={setParentEmail}>
                <SelectTrigger className={errors.parentEmail ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select a parent" />
                </SelectTrigger>
                <SelectContent>
                  {parents.map((parent) => (
                    <SelectItem key={parent.player_id} value={parent.email}>
                      {parent.name} ({parent.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {errors.parentEmail && <p className="text-sm text-destructive">{errors.parentEmail}</p>}
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Kid Name *
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tommy"
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          {/* Birth Month + Year */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Month &amp; Year of Birth *
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

          {submitError && (
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{submitError}</p>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={p.onClose} disabled={p.isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={p.isLoading || loadingParents}>
              {p.isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
