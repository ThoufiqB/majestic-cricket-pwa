"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Login from "../../login";

type Props = {
  onSignedIn: () => void;
};

export function AuthGateCard(p: Props) {
  return (
    <main className="min-h-screen p-6">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Majestic Cricket Club</CardTitle>
            <CardDescription>
              Sign in to view events and mark attendance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Login onSignedIn={p.onSignedIn} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
