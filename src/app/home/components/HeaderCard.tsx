"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, User, Baby, Shield, LogOut } from "lucide-react";
import type { KidsProfile } from "@/lib/types/kids";

type Props = {
  me: any;
  kids?: KidsProfile[];
  activeProfileId?: string;
  isDropdownOpen?: boolean;
  onToggleDropdown?: () => void;
  onSwitchProfile?: (profileId: string) => Promise<void>;
  isAdmin: boolean;
  selectedGroup: "men" | "women";
  msg: string;
};

function getProfileEmoji(profileId: string | undefined, me: any, kids: KidsProfile[] | undefined): string {
  if (!profileId || !me || !kids) return "🧑";
  return profileId === me.player_id ? "🧑" : "👦";
}

function getProfileName(profileId: string | undefined, me: any, kids: KidsProfile[] | undefined): string {
  if (!profileId || !me) return "Profile";
  if (profileId === me.player_id) return me.name || "My Profile";
  const kid = kids?.find((k) => k.kid_id === profileId);
  return kid ? `${kid.name}` : "Unknown";
}

function buildProfilesList(me: any, kids: KidsProfile[] | undefined) {
  return [
    { id: me?.player_id, name: me?.name || "My Profile", type: "parent" as const },
    ...(kids?.map((k) => ({
      id: k.kid_id,
      name: k.name,
      age: k.age,
      type: "kid" as const,
    })) || []),
  ];
}

export function HeaderCard(p: Props) {
  const hasKids = p.kids && p.kids.length > 0;
  const profileId = p.activeProfileId || p.me?.player_id;
  const isKidProfile = profileId && profileId !== p.me?.player_id;
  const currentKid = isKidProfile ? p.kids?.find((k) => k.kid_id === profileId) : null;
  const profiles = buildProfilesList(p.me, p.kids);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            {hasKids && p.onSwitchProfile ? (
              <DropdownMenu open={p.isDropdownOpen} onOpenChange={p.onToggleDropdown}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-auto p-0 hover:bg-transparent">
                    <CardTitle className="text-2xl flex items-center gap-2">
                      {getProfileEmoji(profileId, p.me, p.kids)} {getProfileName(profileId, p.me, p.kids)}
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    </CardTitle>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>Switch Profile</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {profiles.map((profile) => (
                    <DropdownMenuItem
                      key={profile.id}
                      onClick={() => p.onSwitchProfile?.(profile.id)}
                      className={profile.id === profileId ? "bg-accent" : ""}
                    >
                      {profile.type === "parent" ? (
                        <User className="mr-2 h-4 w-4" />
                      ) : (
                        <Baby className="mr-2 h-4 w-4" />
                      )}
                      <span className="flex-1">{profile.name}</span>
                      {profile.type === "kid" && profile.age && (
                        <Badge variant="secondary" className="ml-2">
                          Age {profile.age}
                        </Badge>
                      )}
                      {profile.id === profileId && (
                        <span className="ml-2 text-green-600">✓</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <CardTitle className="text-2xl">
                {getProfileEmoji(profileId, p.me, p.kids)} {getProfileName(profileId, p.me, p.kids)}
              </CardTitle>
            )}

            <CardDescription className="mt-1.5">
              {isKidProfile && currentKid ? (
                <span className="flex items-center gap-2">
                  <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50">
                    👦 Kids Account
                  </Badge>
                  <span>Age {currentKid.age}</span>
                </span>
              ) : (
                <span className="flex items-center gap-2 flex-wrap">
                  {p.isAdmin && (
                    <Badge variant="default" className="bg-purple-600">
                      <Shield className="mr-1 h-3 w-3" /> Admin
                    </Badge>
                  )}
                  {!p.isAdmin && <Badge variant="secondary">Player</Badge>}
                  <Badge variant="outline" className="capitalize">
                    {String(p.me?.group || p.selectedGroup || "").trim()}
                  </Badge>
                  <Badge variant="outline">
                    {String(p.me?.member_type || "").trim()}
                  </Badge>
                </span>
              )}
            </CardDescription>
          </div>

          {/* Admin Link */}
          {p.isAdmin && (
            <Button variant="outline" size="sm" asChild>
              <a href="/admin/events">
                <Shield className="mr-1 h-4 w-4" />
                Admin
              </a>
            </Button>
          )}
        </div>
      </CardHeader>

      {p.msg && (
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{p.msg}</p>
        </CardContent>
      )}
    </Card>
  );
}
