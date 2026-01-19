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

export function EditKidModal(p: EditKidModalProps) {
  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState(p.error);

  // Reset form when modal opens with new kid
  useEffect(() => {
    if (p.open && p.kid) {
      setName(p.kid.name);
      setDateOfBirth(p.kid.date_of_birth);
      setErrors({});
      setSubmitError("");
    }
  }, [p.open, p.kid]);

  if (!p.kid) return null;

  const hasChanges = name !== p.kid.name || dateOfBirth !== p.kid.date_of_birth;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (name && name.length > VALIDATION_RULES.NAME_MAX) {
      newErrors.name = VALIDATION_MESSAGES.NAME_TOO_LONG;
    }

    if (dateOfBirth && !VALIDATION_RULES.DOB_FORMAT.test(dateOfBirth)) {
      newErrors.dateOfBirth = VALIDATION_MESSAGES.DOB_INVALID;
    } else if (dateOfBirth) {
      const dob = new Date(dateOfBirth);
      if (dob > new Date()) {
        newErrors.dateOfBirth = VALIDATION_MESSAGES.DOB_FUTURE;
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
    if (dateOfBirth !== p.kid.date_of_birth) input.date_of_birth = dateOfBirth;

    try {
      await p.onSubmit(input);
    } catch (e: any) {
      setSubmitError(String(e?.message || e));
    }
  };

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
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Date of Birth */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Date of Birth (YYYY-MM-DD)
            </Label>
            <Input
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              placeholder="YYYY-MM-DD"
              className={errors.dateOfBirth ? "border-destructive" : ""}
            />
            {errors.dateOfBirth && (
              <p className="text-sm text-destructive">{errors.dateOfBirth}</p>
            )}
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
