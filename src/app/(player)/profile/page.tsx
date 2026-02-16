"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  User, 
  Mail,
  Users,
  Shield,
  Baby,
  Calendar,
  Phone as PhoneIcon,
  Edit,
  Save,
  X
} from "lucide-react";
import { apiGet } from "@/app/client/api";
import { toast } from "sonner";

interface UserProfile {
  player_id: string;
  name: string;
  email: string;
  group: "men" | "women";
  member_type?: string;
  phone?: string;
  role?: string;
}

interface KidProfile {
  kid_id: string;
  name: string;
  dob?: string;
  age?: number;
  status?: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [kids, setKids] = useState<KidProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("profile");
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const profileData = await apiGet("/api/me");
        setProfile(profileData);
        setEditName(profileData.name || "");
        setEditPhone(profileData.phone || "");
        const kidsData = await apiGet("/api/kids/profile");
        setKids(kidsData.profiles || []);
      } catch (e) {
        console.error("Failed to fetch profile or kids:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  async function handleSaveProfile() {
    if (!profile) return;

    // Validate name
    const nameTrimmed = editName.trim();
    if (nameTrimmed.length < 2 || nameTrimmed.length > 100) {
      toast.error("Name must be between 2 and 100 characters");
      return;
    }
    if (!/^[a-zA-Z ]+$/.test(nameTrimmed)) {
      toast.error("Name must contain only letters and spaces");
      return;
    }

    // Validate phone if provided
    const phoneTrimmed = editPhone.trim();
    if (phoneTrimmed && !/^\+44\d{10}$/.test(phoneTrimmed)) {
      toast.error("Phone must be in format +44 followed by 10 digits");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameTrimmed,
          phone: phoneTrimmed,
          group: profile.group,
          member_type: profile.member_type || "standard",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update profile");
      }

      const result = await response.json();
      setProfile(result.me);
      setIsEditing(false);
      toast.success("Profile updated successfully!");
    } catch (error: any) {
      console.error("Failed to update profile:", error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  function handleCancelEdit() {
    setEditName(profile?.name || "");
    setEditPhone(profile?.phone || "");
    setIsEditing(false);
  }

  if (loading || !profile) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <User className="h-6 w-6" />
        My Profile
      </h1>
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="kids">My Kids</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          {/* Profile Info Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Account Information</CardTitle>
                  <CardDescription>Your registered details</CardDescription>
                </div>
                {!isEditing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                      disabled={saving}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveProfile}
                      disabled={saving}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Name */}
              {isEditing ? (
                <div className="space-y-2">
                  <Label htmlFor="edit-name" className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Name *
                  </Label>
                  <Input
                    id="edit-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter your name"
                    disabled={saving}
                  />
                  <p className="text-xs text-muted-foreground">
                    Letters and spaces only (2-100 characters)
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-3 py-2 border-b">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{profile?.name}</p>
                  </div>
                </div>
              )}
              {/* Email */}
              <div className="flex items-center gap-3 py-2 border-b">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{profile?.email}</p>
                </div>
              </div>
              {/* Phone */}
              {isEditing ? (
                <div className="space-y-2">
                  <Label htmlFor="edit-phone" className="flex items-center gap-2">
                    <PhoneIcon className="h-4 w-4 text-muted-foreground" />
                    Phone Number
                  </Label>
                  <Input
                    id="edit-phone"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+44XXXXXXXXXX"
                    disabled={saving}
                  />
                  <p className="text-xs text-muted-foreground">
                    Format: +44 followed by 10 digits (e.g., +441234567890)
                  </p>
                </div>
              ) : profile?.phone ? (
                <div className="flex items-center gap-3 py-2 border-b">
                  <PhoneIcon className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{profile.phone}</p>
                  </div>
                </div>
              ) : null}
              {/* Group */}
              <div className="flex items-center gap-3 py-2 border-b">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Group</p>
                  <Badge variant="secondary" className="capitalize mt-1">
                    {profile?.group}
                  </Badge>
                </div>
              </div>
              {/* Member Type */}
              {profile?.member_type && (
                <div className="flex items-center gap-3 py-2 border-b">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Member Type</p>
                    <Badge variant="secondary" className="capitalize mt-1">
                      {profile.member_type === "student" ? "Student (25% discount)" : "Standard"}
                    </Badge>
                  </div>
                </div>
              )}
              {/* Role */}
              {profile?.role === "admin" && (
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
          {/* Member ID */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="text-center text-sm text-muted-foreground">
                <p>Member ID</p>
                <code className="text-xs bg-background px-2 py-1 rounded mt-1 inline-block">
                  {profile?.player_id}
                </code>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="kids">
          {/* My Kids Tab Content */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Baby className="h-6 w-6" />
              My Kids
            </h2>
            <p className="text-sm text-muted-foreground">Manage your children's profiles</p>
            {kids.length > 0 ? (
              <div className="space-y-3">
                {kids.map((kid) => (
                  <Card key={kid.kid_id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Baby className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{kid.name}</h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              {kid.age && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5" />
                                  Age {kid.age}
                                </span>
                              )}
                              {kid.status === "active" && (
                                <Badge variant="secondary">Active</Badge>
                              )}
                              {kid.status !== "active" && (
                                <Badge variant="secondary">Inactive</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Baby className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No kids registered</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add your children to manage their cricket activities
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Contact an admin to add a kid profile
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
