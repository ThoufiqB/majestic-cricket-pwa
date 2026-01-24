"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, SortAsc, Eye, EyeOff, Users } from "lucide-react";
import type { EnhancedKidProfile } from "../types";
import { KidCard } from "./KidCard";

type KidsListCardProps = {
  kids: EnhancedKidProfile[];
  onEdit: (kid: EnhancedKidProfile) => void;
  onLinkParent: (kid: EnhancedKidProfile) => void;
  onDelete: (kid: EnhancedKidProfile) => void;
  onReactivate: (kid: EnhancedKidProfile) => void;
};

export function KidsListCard(p: KidsListCardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "age" | "created">("name");

  let filtered = p.kids.filter((k) => {
    const matchesSearch = k.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = showInactive ? k.status === "inactive" : k.status === "active";
    return matchesSearch && matchesStatus;
  });

  filtered = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "age":
        return b.age - a.age;
      case "created":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      default:
        return 0;
    }
  });

  const activeCount = p.kids.filter((k) => k.status === "active").length;
  const inactiveCount = p.kids.filter((k) => k.status === "inactive").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            All Kids
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{activeCount} active</Badge>
            {inactiveCount > 0 && (
              <Badge variant="outline" className="text-muted-foreground">
                {inactiveCount} deleted
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {/* Sort */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as "name" | "age" | "created")}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SortAsc className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Sort: Name</SelectItem>
              <SelectItem value="age">Sort: Age</SelectItem>
              <SelectItem value="created">Sort: Created</SelectItem>
            </SelectContent>
          </Select>
          {/* Toggle Inactive */}
          <Button
            variant={showInactive ? "secondary" : "outline"}
            onClick={() => setShowInactive(!showInactive)}
            className="shrink-0"
          >
            {showInactive ? (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                Showing Deleted
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Show Deleted
              </>
            )}
          </Button>
        </div>

        {/* Results Count */}
        <p className="text-sm text-muted-foreground">
          {filtered.length === 0 ? (
            "No kids found"
          ) : (
            <>
              Showing <span className="font-semibold">{filtered.length}</span> of{" "}
              <span className="font-semibold">{p.kids.length}</span> kid
              {p.kids.length !== 1 ? "s" : ""}
            </>
          )}
        </p>

        {/* Kids Grid */}
        <div className="grid gap-3">
          {filtered.map((kid) => (
            <KidCard
              key={kid.kid_id}
              kid={kid}
              onEdit={() => p.onEdit(kid)}
              onLinkParent={() => p.onLinkParent(kid)}
              onDelete={() => p.onDelete(kid)}
              onReactivate={() => p.onReactivate(kid)}
            />
          ))}
        </div>

        {/* Empty filtered state */}
        {filtered.length === 0 && p.kids.length > 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No kids match your search or filter criteria.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
