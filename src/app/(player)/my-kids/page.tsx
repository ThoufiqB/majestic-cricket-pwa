"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Baby, 
  Plus,
  Calendar,
  User,
  ChevronRight
} from "lucide-react";
import { apiGet } from "@/app/client/api";
import Link from "next/link";

interface KidProfile {
  kid_id: string;
  name: string;
  dob?: string;
  age?: number;
  active: boolean;
}

export default function MyKidsPage() {
  const [kids, setKids] = useState<KidProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchKids() {
      try {
        const data = await apiGet("/api/kids/profile");
        setKids(data.profiles || []);
      } catch (e) {
        console.error("Failed to fetch kids:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchKids();
  }, []);

  if (loading) {
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
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Baby className="h-6 w-6" />
            My Kids
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your children's profiles
          </p>
        </div>
      </div>

      {/* Kids List */}
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
                        {!kid.active && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
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

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Profile Switching</p>
              <p className="text-muted-foreground">
                Switch between your profile and your kids' profiles from the Home page 
                to view and manage their events separately.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
