"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Users, 
  Baby, 
  Search,
  Shield,
  Phone,
  Mail,
  ChevronRight,
  UserCog,
  Filter
} from "lucide-react";

interface Member {
  player_id: string;
  name: string;
  email: string;
  phone?: string;
  group: "men" | "women";
  member_type?: string;
  role?: string;
  kids_count: number;
}

interface MemberStats {
  total: number;
  men: number;
  women: number;
  admins: number;
}

interface MemberDetail extends Member {
  kids: Array<{
    kid_id: string;
    name: string;
    age?: number;
    status: string;
  }>;
}

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  
  // Member detail modal
  const [selectedMember, setSelectedMember] = useState<MemberDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, [groupFilter, roleFilter]);

  async function fetchMembers() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (groupFilter !== "all") params.set("group", groupFilter);
      if (roleFilter !== "all") params.set("role", roleFilter);
      
      const res = await fetch(`/api/admin/members/list?${params}`);
      const data = await res.json();
      setMembers(data.members || []);
      setStats(data.stats || null);
    } catch (e) {
      console.error("Failed to fetch members:", e);
    } finally {
      setLoading(false);
    }
  }

  async function openMemberDetail(memberId: string) {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/members/${memberId}`);
      const data = await res.json();
      setSelectedMember(data);
    } catch (e) {
      console.error("Failed to fetch member detail:", e);
    } finally {
      setDetailLoading(false);
    }
  }

  async function toggleAdminRole(memberId: string, currentRole: string) {
    setUpdating(true);
    try {
      const newRole = currentRole === "admin" ? "player" : "admin";
      await fetch(`/api/admin/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      // Update local state
      if (selectedMember) {
        setSelectedMember({ ...selectedMember, role: newRole });
      }
      // Refresh list
      fetchMembers();
    } catch (e) {
      console.error("Failed to update role:", e);
    } finally {
      setUpdating(false);
    }
  }

  // Filter by search locally
  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      (m.phone && m.phone.includes(search))
  );

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <Tabs defaultValue="players" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="players" className="gap-2">
            <Users className="h-4 w-4" />
            Players
          </TabsTrigger>
          <TabsTrigger value="kids" asChild>
            <Link href="/admin/kids" className="gap-2 inline-flex items-center justify-center">
              <Baby className="h-4 w-4" />
              Kids
            </Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.men}</p>
              <p className="text-xs text-muted-foreground">Men</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-pink-600">{stats.women}</p>
              <p className="text-xs text-muted-foreground">Women</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{stats.admins}</p>
              <p className="text-xs text-muted-foreground">Admins</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={groupFilter} onValueChange={setGroupFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Groups</SelectItem>
                  <SelectItem value="men">Men</SelectItem>
                  <SelectItem value="women">Women</SelectItem>
                </SelectContent>
              </Select>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                  <SelectItem value="player">Players</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Members List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Members
            <Badge variant="secondary" className="ml-2">
              {filteredMembers.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No members found</p>
              {search && <p className="text-sm">Try a different search term</p>}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMembers.map((member) => (
                <div
                  key={member.player_id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => openMemberDetail(member.player_id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{member.name}</p>
                        {member.role === "admin" && (
                          <Badge className="text-[10px]">
                            <Shield className="h-3 w-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="capitalize">
                      {member.group}
                    </Badge>
                    {member.kids_count > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        <Baby className="h-3 w-3 mr-1" />
                        {member.kids_count}
                      </Badge>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Member Detail Modal */}
      <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Member Details
            </DialogTitle>
            <DialogDescription>View and manage member information</DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          ) : selectedMember ? (
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{selectedMember.name}</h3>
                  <Badge variant="outline" className="capitalize">
                    {selectedMember.group}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{selectedMember.email}</span>
                  </div>
                  {selectedMember.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{selectedMember.phone}</span>
                    </div>
                  )}
                </div>

                {/* Role Badge & Toggle */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span className="text-sm">Role:</span>
                    <Badge variant={selectedMember.role === "admin" ? "default" : "secondary"}>
                      {selectedMember.role === "admin" ? "Admin" : "Player"}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleAdminRole(selectedMember.player_id, selectedMember.role || "player")}
                    disabled={updating}
                  >
                    {selectedMember.role === "admin" ? "Remove Admin" : "Make Admin"}
                  </Button>
                </div>
              </div>

              {/* Linked Kids */}
              {selectedMember.kids && selectedMember.kids.length > 0 && (
                <div className="pt-2 border-t">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Baby className="h-4 w-4" />
                    Linked Kids ({selectedMember.kids.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedMember.kids.map((kid) => (
                      <div
                        key={kid.kid_id}
                        className="flex items-center justify-between p-2 rounded bg-muted/50"
                      >
                        <span className="text-sm">{kid.name}</span>
                        <div className="flex items-center gap-2">
                          {kid.age && (
                            <Badge variant="outline" className="text-xs">
                              Age {kid.age}
                            </Badge>
                          )}
                          <Badge
                            variant={kid.status === "active" ? "secondary" : "outline"}
                            className="text-xs"
                          >
                            {kid.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Member ID */}
              <div className="pt-2 border-t text-center">
                <p className="text-xs text-muted-foreground">Member ID</p>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {selectedMember.player_id}
                </code>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
