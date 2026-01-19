"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Loader2, LogOut, Save, User } from "lucide-react";

type Props = {
  msg: string;

  profileGroup: "" | "men" | "women";
  setProfileGroup: (v: "" | "men" | "women") => void;

  profileMemberType: "" | "standard" | "student";
  setProfileMemberType: (v: "" | "standard" | "student") => void;

  profilePhone: string;
  setProfilePhone: (v: string) => void;

  savingProfile: boolean;
  onSave: () => void;

  onSignOut: () => void;
};

export function ProfileGateCard(p: Props) {
  return (
    <main className="min-h-screen p-6">
      <div className="max-w-md mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <User className="h-6 w-6" />
              Complete your profile
            </CardTitle>
            <CardDescription>
              We need this once so you see the right events and the correct fee (student discount).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {p.msg && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted p-3 rounded-lg">
                {p.msg}
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="group">
                Group <span className="text-destructive">*</span>
              </Label>
              <Select
                value={p.profileGroup || undefined}
                onValueChange={(v) => p.setProfileGroup(v as "" | "men" | "women")}
              >
                <SelectTrigger id="group">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="men">Men</SelectItem>
                  <SelectItem value="women">Women</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="memberType">
                Member type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={p.profileMemberType || undefined}
                onValueChange={(v) => p.setProfileMemberType(v as "" | "standard" | "student")}
              >
                <SelectTrigger id="memberType">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="student">Student (25% off)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                value={p.profilePhone}
                onChange={(e) => p.setProfilePhone(e.target.value)}
                placeholder="e.g., 07xxxxxxxxx"
              />
              <p className="text-xs text-muted-foreground">
                We'll use this later only if you enable SMS/WhatsApp reminders.
              </p>
            </div>

            <Button
              className="w-full"
              disabled={p.savingProfile}
              onClick={p.onSave}
            >
              {p.savingProfile ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save profile
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Account</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={p.onSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
