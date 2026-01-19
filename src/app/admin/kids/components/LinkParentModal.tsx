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
import { Loader2, UserPlus, Mail, Baby } from "lucide-react";
import { VALIDATION_MESSAGES, VALIDATION_RULES } from "../constants";
import type { EnhancedKidProfile } from "../types";

type LinkParentModalProps = {
  open: boolean;
  kid: EnhancedKidProfile | null;
  onClose: () => void;
  onSubmit: (parentEmail: string) => Promise<void>;
  isLoading?: boolean;
  error?: string;
};

export function LinkParentModal(p: LinkParentModalProps) {
  const [parentEmail, setParentEmail] = useState("");
  const [error, setError] = useState(p.error);
  const [submitError, setSubmitError] = useState("");

  // Reset form when modal opens
  useEffect(() => {
    if (p.open) {
      setParentEmail("");
      setError("");
      setSubmitError("");
    }
  }, [p.open]);

  if (!p.kid) return null;

  const isValidEmail = VALIDATION_RULES.EMAIL_FORMAT.test(parentEmail);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (!parentEmail.trim()) {
      setError(VALIDATION_MESSAGES.PARENT_EMAIL_REQUIRED);
      return;
    }

    if (!isValidEmail) {
      setError(VALIDATION_MESSAGES.PARENT_EMAIL_INVALID);
      return;
    }

    try {
      await p.onSubmit(parentEmail.toLowerCase().trim());
    } catch (e: any) {
      setSubmitError(String(e?.message || e));
    }
  };

  return (
    <Dialog open={p.open} onOpenChange={(isOpen) => !isOpen && p.onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Link Secondary Parent
          </DialogTitle>
          <DialogDescription>
            Add another parent who can manage this child's profile.
          </DialogDescription>
        </DialogHeader>

        {/* Kid Info */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-center gap-2">
              <Baby className="h-4 w-4 text-primary" />
              <span className="font-semibold">{p.kid.name}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium">Current parents:</p>
              <ul className="ml-4 mt-1">
                {p.kid.parent_emails.map((email, idx) => (
                  <li key={idx} className="flex items-center gap-1">
                    <span>•</span> {email}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Secondary Parent Email */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Secondary Parent Email *
            </Label>
            <Input
              type="email"
              value={parentEmail}
              onChange={(e) => {
                setParentEmail(e.target.value);
                setError("");
              }}
              placeholder="father@example.com"
              className={error ? "border-destructive" : ""}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
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
            <Button type="submit" disabled={p.isLoading || !isValidEmail}>
              {p.isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Linking...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Link Parent
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
