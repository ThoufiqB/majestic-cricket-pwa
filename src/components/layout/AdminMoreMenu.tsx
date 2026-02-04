"use client";

import Link from "next/link";
import { X, CreditCard, Settings, ClipboardList, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

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
  const pathname = usePathname();

  const menuItems = [
    {
      href: "/admin/members/registrations",
      label: "New Registrations",
      icon: <UserPlus className="h-5 w-5" />,
      description: "Review pending requests",
    },
    {
      href: "/admin/manage-events",
      label: "Manage events",
      icon: <ClipboardList className="h-5 w-5" />,
      description: "Edit & organize events",
    },
    {
      href: "/admin/payments",
      label: "Payments",
      icon: <CreditCard className="h-5 w-5" />,
      description: "Track transactions",
    },
    {
      href: "/admin/settings",
      label: "Settings",
      icon: <Settings className="h-5 w-5" />,
      description: "Configure club settings",
    },
  ];

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
          "fixed top-0 right-0 z-50 h-full w-72 bg-card shadow-2xl flex flex-col",
          open ? "translate-x-0" : "translate-x-full",
          "transition-transform duration-300 ease-in-out"
        )}
      >
        <div className="flex items-center justify-between p-5 border-b bg-gradient-to-r from-[#1e3a5f]/5 to-[#2d5a8a]/5">
          <h2 className="text-lg font-bold text-[#1e3a5f]">More Options</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#1e3a5f]/10 transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5 text-[#1e3a5f]" />
          </button>
        </div>
        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-start gap-3 px-3 py-3 rounded-lg transition-all group",
                  isActive
                    ? "bg-[#1e3a5f]/10 text-[#1e3a5f] shadow-sm"
                    : "text-muted-foreground hover:text-[#2d5a8a] hover:bg-[#2d5a8a]/5"
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 transition-transform group-hover:scale-110",
                    isActive ? "text-[#1e3a5f]" : "text-muted-foreground"
                  )}
                >
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{item.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {item.description}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            Admin Panel
          </p>
        </div>
      </div>
    </>
  );
}