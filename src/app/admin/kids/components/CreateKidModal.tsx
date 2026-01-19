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

export function CreateKidModal(p: CreateKidModalProps) {
  const [parentEmail, setParentEmail] = useState("");
  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState(p.error);
  const [parents, setParents] = useState<Parent[]>([]);
  const [loadingParents, setLoadingParents] = useState(true);

  // Reset form when modal opens
  useEffect(() => {
    if (p.open) {
      setParentEmail("");
      setName("");
      setDateOfBirth("");
      setErrors({});
      setSubmitError("");
    }
  }, [p.open]);

  // Fetch parent list on mount
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

    if (p.open) {
      fetchParents();
    }
  }, [p.open]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!parentEmail.trim()) {
      newErrors.parentEmail = VALIDATION_MESSAGES.PARENT_EMAIL_REQUIRED;
    }

    if (!name.trim()) {
      newErrors.name = VALIDATION_MESSAGES.NAME_REQUIRED;
    } else if (name.length > VALIDATION_RULES.NAME_MAX) {
      newErrors.name = VALIDATION_MESSAGES.NAME_TOO_LONG;
    }

    if (!dateOfBirth) {
      newErrors.dateOfBirth = VALIDATION_MESSAGES.DOB_REQUIRED;
    } else {
      try {
        const dob = new Date(dateOfBirth + "T00:00:00Z");
        const today = new Date();
        if (dob > today) {
          newErrors.dateOfBirth = VALIDATION_MESSAGES.DOB_FUTURE;
        } else if (dob.getFullYear() < 1900) {
          newErrors.dateOfBirth = "Date of birth must be after 1900";
        }
      } catch {
        newErrors.dateOfBirth = "Invalid date";
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
        date_of_birth: dateOfBirth,
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
          {/* Parent Email Dropdown */}
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
            {errors.parentEmail && (
              <p className="text-sm text-destructive">{errors.parentEmail}</p>
            )}
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
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Date of Birth */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Date of Birth *
            </Label>
            <Input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              className={errors.dateOfBirth ? "border-destructive" : ""}
            />
            {errors.dateOfBirth && (
              <p className="text-sm text-destructive">{errors.dateOfBirth}</p>
            )}
          </div>

          {/* Submit Error */}
          {submitError && (
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {submitError}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={p.onClose}
              disabled={p.isLoading}
            >
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
