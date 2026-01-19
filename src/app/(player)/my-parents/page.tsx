"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  UserCircle, 
  Mail,
  Phone,
  Calendar
} from "lucide-react";
import { apiGet } from "@/app/client/api";
import { useProfile } from "@/components/context/ProfileContext";

interface ParentInfo {
  player_id: string;
  name: string;
  email?: string;
  phone?: string;
  group?: string;
}

export default function MyParentsPage() {
  const { playerId, activeProfileId, isKidProfile } = useProfile();
  const [parents, setParents] = useState<ParentInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchParents() {
      if (!isKidProfile || !playerId) {
        setLoading(false);
        return;
      }
      
      try {
        // For now, the parent is the logged-in user
        const data = await apiGet("/api/me");
        setParents([{
          player_id: data.player_id,
          name: data.name || "Parent",
          email: data.email,
          phone: data.phone,
          group: data.group,
        }]);
      } catch (e) {
        console.error("Failed to fetch parent info:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchParents();
  }, [isKidProfile, playerId]);

  if (!isKidProfile) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <UserCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Not viewing as a kid</h2>
          <p className="text-muted-foreground">
            Switch to a kid profile from the Home page to see parent information.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UserCircle className="h-6 w-6" />
          My Parents
        </h1>
        <p className="text-sm text-muted-foreground">
          Your linked parent/guardian information
        </p>
      </div>

      {/* Parents List */}
      {parents.length > 0 ? (
        <div className="space-y-3">
          {parents.map((parent) => (
            <Card key={parent.player_id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserCircle className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{parent.name}</h3>
                    <div className="space-y-1 mt-1">
                      {parent.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3.5 w-3.5" />
                          <span>{parent.email}</span>
                        </div>
                      )}
                      {parent.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3.5 w-3.5" />
                          <span>{parent.phone}</span>
                        </div>
                      )}
                    </div>
                    {parent.group && (
                      <Badge variant="secondary" className="mt-2 capitalize">
                        {parent.group}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <UserCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No parent information found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
