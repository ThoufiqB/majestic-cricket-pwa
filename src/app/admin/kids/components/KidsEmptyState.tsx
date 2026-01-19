"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Baby, Plus } from "lucide-react";

type Props = {
  onCreateClick: () => void;
};

export function KidsEmptyState({ onCreateClick }: Props) {
  return (
    <Card>
      <CardContent className="pt-12 pb-12 text-center space-y-4">
        <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
          <Baby className="h-10 w-10 text-primary" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">No Kids Yet</h2>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Create your first kids profile to get started managing children in the system.
          </p>
        </div>
        
        <Button onClick={onCreateClick} size="lg">
          <Plus className="h-5 w-5 mr-2" />
          Create Kid Profile
        </Button>
      </CardContent>
    </Card>
  );
}
