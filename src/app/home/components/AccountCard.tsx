"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, Settings } from "lucide-react";

type Props = {
  onSignOut: () => void;
};

export function AccountCard(p: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Account
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Button variant="outline" onClick={p.onSignOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </CardContent>
    </Card>
  );
}
