"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Settings, 
  Building2, 
  Bell, 
  Download,
  Construction
} from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      {/* Club Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Club Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clubName">Club Name</Label>
            <Input id="clubName" defaultValue="Majestic Cricket Club" disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clubEmail">Contact Email</Label>
            <Input id="clubEmail" type="email" defaultValue="info@majesticcricket.com" disabled />
          </div>
          <p className="text-xs text-muted-foreground">
            Contact support to update club information.
          </p>
        </CardContent>
      </Card>

      {/* Default Fees - Coming Soon */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Default Fees
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4 py-4">
          <Construction className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Fee configuration coming soon
          </p>
        </CardContent>
      </Card>

      {/* Notifications - Coming Soon */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4 py-4">
          <Construction className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Notification settings coming soon
          </p>
        </CardContent>
      </Card>

      {/* Export Data */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Download your club data for backup or reporting.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled>
              Export Members (CSV)
            </Button>
            <Button variant="outline" size="sm" disabled>
              Export Events (CSV)
            </Button>
            <Button variant="outline" size="sm" disabled>
              Export Payments (CSV)
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Export functionality coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
