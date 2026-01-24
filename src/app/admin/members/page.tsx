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
      if (selectedMember) {
        setSelectedMember({ ...selectedMember, role: newRole });
      }
      fetchMembers();
    } catch (e) {
      console.error("Failed to update role:", e);
    } finally {
      setUpdating(false);
    }
  }

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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                <SelectTrigger className="w-full sm:w-[120px]">
                  <SelectValue placeholder="Group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Groups</SelectItem>
                  <SelectItem value="men">Men</SelectItem>
                  <SelectItem value="women">Women</SelectItem>
                </SelectContent>
              </Select>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-[120px]">
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

      {/* Members List ... */}
      {/* The rest of the file (member list and modal) is unchanged */}
    </div>
  );
}
