"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
};

/**
 * AdminMoreMenu
 *
 * A slide‑out panel that appears from the right side when the admin
 * clicks the More icon in the bottom navigation.  The panel lists
 * additional admin pages (Payments, Settings, Manage events).  An
 * overlay darkens the rest of the UI and clicking it closes the
 * menu.  The component uses simple CSS transitions for sliding.
 */
export function AdminMoreMenu({ open, onClose }: Props) {
  return (
    <>
      {/* Dark overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      ></div>
      {/* Sliding panel */}
      <div
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-64 bg-card shadow-lg flex flex-col",
          open ? "translate-x-0" : "translate-x-full",
          "transition-transform duration-300"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">More</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
          <Link href="/admin/payments" onClick={onClose} className="block px-3 py-2 rounded hover:bg-accent">
            Payments
          </Link>
          <Link href="/admin/settings" onClick={onClose} className="block px-3 py-2 rounded hover:bg-accent">
            Settings
          </Link>
          <Link href="/admin/manage-events" onClick={onClose} className="block px-3 py-2 rounded hover:bg-accent">
            Manage events
          </Link>
        </nav>
      </div>
    </>
  );
}