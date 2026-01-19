"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  User, 
  Mail,
  Phone,
  Users,
  Shield,
  Save,
  CheckCircle
} from "lucide-react";
import { apiGet, apiPatch } from "@/app/client/api";

interface UserProfile {
  player_id: string;
  name: string;
  email: string;
  phone?: string;
  group: "men" | "women";
  member_type?: string;
  role?: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [phone, setPhone] = useState("");

  useEffect(() => {
    async function fetchProfile() {
      try {
        const data = await apiGet("/api/me");
        setProfile(data);
        setPhone(data.phone || "");
      } catch (e) {
        console.error("Failed to fetch profile:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  async function handleSavePhone() {
    if (!profile) return;
    setSaving(true);
    try {
      await apiPatch("/api/profile", { phone });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error("Failed to update phone:", e);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load profile</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <User className="h-6 w-6" />
          My Profile
        </h1>
        <p className="text-sm text-muted-foreground">
          View and manage your account details
        </p>
      </div>

      {/* Profile Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Account Information</CardTitle>
          <CardDescription>Your registered details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name */}
          <div className="flex items-center gap-3 py-2 border-b">
            <User className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{profile.name}</p>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-center gap-3 py-2 border-b">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{profile.email}</p>
            </div>
          </div>

          {/* Group */}
          <div className="flex items-center gap-3 py-2 border-b">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Group</p>
              <Badge variant="secondary" className="capitalize mt-1">
                {profile.group}
              </Badge>
            </div>
          </div>

          {/* Role */}
          {profile.role === "admin" && (
            <div className="flex items-center gap-3 py-2 border-b">
              <Shield className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Role</p>
                <Badge className="mt-1">Admin</Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Phone Update */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Contact Number
          </CardTitle>
          <CardDescription>Update your phone number for WhatsApp notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <div className="flex gap-2">
              <Input
                id="phone"
                type="tel"
                placeholder="+44 7XXX XXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={handleSavePhone} 
                disabled={saving || phone === profile.phone}
              >
                {saved ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Saved
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Member ID */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="text-center text-sm text-muted-foreground">
            <p>Member ID</p>
            <code className="text-xs bg-background px-2 py-1 rounded mt-1 inline-block">
              {profile.player_id}
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
