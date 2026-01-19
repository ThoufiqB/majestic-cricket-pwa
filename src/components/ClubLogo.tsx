"use client";

import Image from "next/image";

interface ClubLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { logo: 40, text: "text-lg" },
  md: { logo: 56, text: "text-xl" },
  lg: { logo: 72, text: "text-2xl" },
  xl: { logo: 96, text: "text-3xl" },
};

export function ClubLogo({ size = "md", showText = false, className = "" }: ClubLogoProps) {
  const { logo: logoSize } = sizeMap[size];

  return (
    <div className={`flex items-center ${className}`}>
      <div 
        className="relative overflow-hidden"
        style={{ width: logoSize, height: logoSize }}
      >
        <Image
          src="/MajesticCC-logo.jpeg"
          alt="Majestic Cricket Club"
          width={logoSize}
          height={logoSize}
          className="object-contain"
          priority
        />
      </div>
    </div>
  );
}

// Variant for dark backgrounds (like login page)
export function ClubLogoLight({ size = "md", className = "" }: ClubLogoProps) {
  const { logo: logoSize } = sizeMap[size];

  return (
    <div className={`flex items-center ${className}`}>
      <div 
        className="relative overflow-hidden"
        style={{ width: logoSize, height: logoSize }}
      >
        <Image
          src="/MajesticCC-logo.jpeg"
          alt="Majestic Cricket Club"
          width={logoSize}
          height={logoSize}
          className="object-contain"
          priority
        />
      </div>
    </div>
  );
}
