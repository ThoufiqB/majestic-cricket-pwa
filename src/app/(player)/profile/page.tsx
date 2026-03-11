"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  X,
  Bell,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  UserCheck2,
} from "lucide-react";
import { apiGet } from "@/app/client/api";
import { toast } from "sonner";
import { useProfile } from "@/components/context/ProfileContext";

interface UserProfile {
  player_id: string;
  name: string;
  email: string;
  group: string;
  groups?: string[];
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

interface LinkedYouthProfile {
  player_id: string;
  name: string;
  email: string;
  groups?: string[];
  yearOfBirth?: number | null;
  status?: string;
}

interface IncomingRequest {
  id: string;
  youth_uid: string;
  youth_name: string;
  youth_email: string;
  youth_groups: string[];
  status: string;
  created_at: string | null;
}

interface MyRegistrationStatus {
  status: string;
  requested_at: string | null;
  rejection_reason: string | null;
  rejection_notes: string | null;
  paymentManagerName: string | null;
  groups: string[];
}

export default function ProfilePage() {
  const { requestCount, refreshProfile } = useProfile();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [kids, setKids] = useState<KidProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("profile");

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);

  // Requests tab state
  const [incoming, setIncoming] = useState<IncomingRequest[]>([]);
  const [myStatus, setMyStatus] = useState<MyRegistrationStatus | null>(null);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);

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

  useEffect(() => {
    if (tab !== "requests") return;
    async function fetchRequests() {
      setRequestsLoading(true);
      try {
        const data = await apiGet("/api/me/requests");
        setIncoming(data.incoming || []);
        setMyStatus(data.my_status || null);
      } catch (e) {
        console.error("Failed to fetch requests:", e);
      } finally {
        setRequestsLoading(false);
      }
    }
    fetchRequests();
  }, [tab]);

  async function handleApprove(requestId: string) {
    setActioning(requestId);
    try {
      const res = await fetch(`/api/me/requests/${requestId}/approve`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to approve");
      }
      toast.success("Approved! The player's registration is now with admin for review.");
      setIncoming(prev => prev.filter(r => r.id !== requestId));
      refreshProfile();
    } catch (e: any) {
      toast.error(e.message || "Failed to approve request");
    } finally {
      setActioning(null);
    }
  }

  async function handleReject(requestId: string) {
    setActioning(requestId);
    try {
      const res = await fetch(`/api/me/requests/${requestId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Declined by parent/guardian" }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to reject");
      }
      toast.success("Request declined.");
      setIncoming(prev => prev.filter(r => r.id !== requestId));
      refreshProfile();
    } catch (e: any) {
      toast.error(e.message || "Failed to reject request");
    } finally {
      setActioning(null);
    }
  }

  async function handleSaveProfile() {
    if (!profile) return;
    const nameTrimmed = editName.trim();
    if (nameTrimmed.length < 2 || nameTrimmed.length > 100) {
      toast.error("Name must be between 2 and 100 characters");
      return;
    }
    if (!/^[a-zA-Z ]+$/.test(nameTrimmed)) {
      toast.error("Name must contain only letters and spaces");
      return;
    }
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

  function statusLabel(status: string) {
    switch (status) {
      case "pending_parent_approval": return "Awaiting parent approval";
      case "pending_admin_approval":  return "Awaiting admin approval";
      case "pending":                 return "Awaiting admin approval";
      case "approved":                return "Approved";
      case "rejected":                return "Rejected by admin";
      case "rejected_by_parent":      return "Declined by parent";
      default:                        return status;
    }
  }

  function statusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
    if (status === "approved") return "default";
    if (status.startsWith("rejected")) return "destructive";
    return "secondary";
  }

  function statusIcon(status: string) {
    if (status === "approved") return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (status.startsWith("rejected")) return <XCircle className="h-5 w-5 text-destructive" />;
    return <Clock className="h-5 w-5 text-amber-500" />;
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
          <TabsTrigger value="requests" className="relative">
            Requests
            {requestCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white font-bold flex items-center justify-center leading-none">
                {requestCount > 9 ? "9+" : requestCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Profile Tab ────────────────────────────────────────────────── */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Account Information</CardTitle>
                  <CardDescription>Your registered details</CardDescription>
                </div>
                {!isEditing ? (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-2" />Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCancelEdit} disabled={saving}>
                      <X className="h-4 w-4 mr-2" />Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveProfile} disabled={saving}>
                      <Save className="h-4 w-4 mr-2" />{saving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <div className="space-y-2">
                  <label htmlFor="edit-name" className="flex items-center gap-2 text-sm font-medium">
                    <User className="h-4 w-4 text-muted-foreground" />Name *
                  </label>
                  <input
                    id="edit-name"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter your name"
                    disabled={saving}
                  />
                  <p className="text-xs text-muted-foreground">Letters and spaces only (2–100 characters)</p>
                </div>
              ) : (
                <div className="flex items-center gap-3 py-2 border-b">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1"><p className="text-sm text-muted-foreground">Name</p><p className="font-medium">{profile.name}</p></div>
                </div>
              )}

              <div className="flex items-center gap-3 py-2 border-b">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1"><p className="text-sm text-muted-foreground">Email</p><p className="font-medium">{profile.email}</p></div>
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  <label htmlFor="edit-phone" className="flex items-center gap-2 text-sm font-medium">
                    <PhoneIcon className="h-4 w-4 text-muted-foreground" />Phone Number
                  </label>
                  <input
                    id="edit-phone"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+44XXXXXXXXXX"
                    disabled={saving}
                  />
                  <p className="text-xs text-muted-foreground">Format: +44 followed by 10 digits</p>
                </div>
              ) : profile.phone ? (
                <div className="flex items-center gap-3 py-2 border-b">
                  <PhoneIcon className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1"><p className="text-sm text-muted-foreground">Phone</p><p className="font-medium">{profile.phone}</p></div>
                </div>
              ) : null}

              <div className="flex items-center gap-3 py-2 border-b">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Group(s)</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(profile.groups && profile.groups.length > 0 ? profile.groups : [profile.group]).map(g => (
                      <Badge key={g} variant="secondary" className="capitalize">{g}</Badge>
                    ))}
                  </div>
                </div>
              </div>

              {profile.member_type && (
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

              {profile.role === "admin" && (
                <div className="flex items-center gap-3 py-2 border-b">
                  <Shield className="h-5 w-5 text-primary" />
                  <div className="flex-1"><p className="text-sm text-muted-foreground">Role</p><Badge className="mt-1">Admin</Badge></div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-muted/50 mt-4">
            <CardContent className="p-4">
              <div className="text-center text-sm text-muted-foreground">
                <p>Member ID</p>
                <code className="text-xs bg-background px-2 py-1 rounded mt-1 inline-block">{profile.player_id}</code>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── My Kids Tab ──────────────────────────────────────────────────── */}
        <TabsContent value="kids">
          {(() => {
            const linkedYouth: LinkedYouthProfile[] = (profile as any).linked_youth_profiles || [];
            const hasKids = kids.length > 0;
            const hasYouth = linkedYouth.length > 0;
            return (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2"><Baby className="h-6 w-6" />My Kids</h2>
                  <p className="text-sm text-muted-foreground mt-1">Manage your children's profiles</p>
                </div>

                {/* Dependent kid profiles (admin-created) */}
                {hasKids && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kid Profiles</p>
                    {kids.map((kid) => (
                      <Card key={kid.kid_id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                              <Baby className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg">{kid.name}</h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                {kid.age && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Age {kid.age}</span>}
                                <Badge variant="secondary">{kid.status === "active" ? "Active" : "Inactive"}</Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Linked youth — full player accounts linked to this parent */}
                {hasYouth && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Linked Youth Accounts</p>
                    {linkedYouth.map((youth) => (
                      <Card key={youth.player_id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
                              <UserCheck2 className="h-6 w-6 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-lg">{youth.name}</h3>
                                <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50 text-xs">Youth Account</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground truncate">{youth.email}</p>
                              {youth.groups && youth.groups.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {youth.groups.map((g) => (
                                    <Badge key={g} variant="secondary" className="text-xs capitalize">{g}</Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Empty state — only when both lists are empty */}
                {!hasKids && !hasYouth && (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Baby className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No kids registered</h3>
                      <p className="text-sm text-muted-foreground mb-4">Add your children to manage their cricket activities</p>
                      <p className="text-xs text-muted-foreground">Contact an admin to add a kid profile</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })()}
        </TabsContent>

        {/* ── Requests Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="requests">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2"><Bell className="h-6 w-6" />Requests</h2>
              <p className="text-sm text-muted-foreground mt-1">Profile-manager approvals and your registration status</p>
            </div>

            {requestsLoading ? (
              <div className="space-y-3"><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
            ) : (
              <>
                {incoming.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      Profile Manager Requests
                    </h3>
                    {incoming.map((req) => (
                      <Card key={req.id} className="border-amber-200 bg-amber-50">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                              <UserCheck className="h-5 w-5 text-amber-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold">{req.youth_name}</p>
                              <p className="text-sm text-muted-foreground">{req.youth_email}</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {req.youth_groups.map(g => (
                                  <Badge key={g} variant="outline" className="text-xs">{g}</Badge>
                                ))}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">wants to add you as their Profile Manager</p>
                              {req.created_at && (
                                <p className="text-xs text-muted-foreground">
                                  Requested {new Date(req.created_at).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              className="flex-1 bg-green-600 hover:bg-green-700"
                              disabled={actioning === req.id}
                              onClick={() => handleApprove(req.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              {actioning === req.id ? "Approving…" : "Approve"}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="flex-1"
                              disabled={actioning === req.id}
                              onClick={() => handleReject(req.id)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />Reject
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {myStatus && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      My Registration Status
                    </h3>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            {statusIcon(myStatus.status)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold">Registration</p>
                              <Badge variant={statusBadgeVariant(myStatus.status)}>
                                {statusLabel(myStatus.status)}
                              </Badge>
                            </div>
                            {myStatus.groups.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {myStatus.groups.map(g => (
                                  <Badge key={g} variant="outline" className="text-xs">{g}</Badge>
                                ))}
                              </div>
                            )}
                            {myStatus.paymentManagerName && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Payment manager: <span className="font-medium">{myStatus.paymentManagerName}</span>
                              </p>
                            )}
                            {myStatus.status === "pending_parent_approval" && (
                              <p className="text-sm text-amber-700 bg-amber-50 rounded p-2 mt-2 border border-amber-200">
                                ⏳ Waiting for <strong>{myStatus.paymentManagerName || "your parent/guardian"}</strong> to approve.
                                Ask them to open <strong>Profile → Requests</strong>.
                              </p>
                            )}
                            {myStatus.status === "pending_admin_approval" && (
                              <p className="text-sm text-blue-700 bg-blue-50 rounded p-2 mt-2 border border-blue-200">
                                ✅ Your parent approved! An admin will review your registration shortly.
                              </p>
                            )}
                            {myStatus.status === "rejected_by_parent" && (
                              <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700 border border-red-200">
                                <p className="font-medium">Declined by parent/guardian</p>
                                {myStatus.rejection_reason && <p className="mt-1">{myStatus.rejection_reason}</p>}
                                <p className="mt-1 text-xs">You can re-submit with a different payment manager.</p>
                              </div>
                            )}
                            {myStatus.status === "rejected" && (
                              <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700 border border-red-200">
                                <p className="font-medium">Rejected by admin</p>
                                {myStatus.rejection_reason && <p className="mt-1">{myStatus.rejection_reason}</p>}
                                {myStatus.rejection_notes && <p className="mt-1 text-xs">{myStatus.rejection_notes}</p>}
                              </div>
                            )}
                            {myStatus.requested_at && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Submitted {new Date(myStatus.requested_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {incoming.length === 0 && !myStatus && (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Bell className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No requests</h3>
                      <p className="text-sm text-muted-foreground">
                        Profile-manager requests from youth players will appear here.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
