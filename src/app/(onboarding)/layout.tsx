import { ReactNode } from "react";

export default function MinimalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e3a5f]/5 via-background to-[#1e3a5f]/10 p-4">
      {children}
    </div>
  );
}
