"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, X, Copy } from "lucide-react";
import type { EventRow } from "../services";

type Props = {
  ev: EventRow;
  text: string;
  onClose: () => void;
  onCopy: () => void;
};

export function WhatsAppPopup(p: Props) {
  return (
    <Card className="mt-4 border-green-200 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Notify Players (WhatsApp)
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={p.onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Copy and paste into your WhatsApp group.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <pre className="text-xs whitespace-pre-wrap rounded-lg border bg-background p-3 overflow-auto max-h-40">
          {p.text}
        </pre>

        <Button 
          onClick={p.onCopy} 
          className="w-full bg-green-600 hover:bg-green-700 text-white"
        >
          <Copy className="h-4 w-4 mr-2" />
          Copy to Clipboard
        </Button>
      </CardContent>
    </Card>
  );
}
