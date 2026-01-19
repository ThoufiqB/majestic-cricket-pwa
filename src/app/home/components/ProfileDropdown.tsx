"use client";

import { useEffect, useRef, useState } from "react";

export interface ProfileItem {
  id: string;
  name: string;
  age?: number;
  type: "parent" | "kid";
}

export interface ProfileDropdownProps {
  currentProfileId: string;
  profiles: ProfileItem[];
  onSelect: (profileId: string) => Promise<void>;
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileDropdown(props: ProfileDropdownProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on escape or click outside
  useEffect(() => {
    if (!props.isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        props.onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        props.onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [props.isOpen, props.onClose]);

  const handleSelect = async (profileId: string) => {
    if (profileId === props.currentProfileId) {
      props.onClose();
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await props.onSelect(profileId);
      setIsSubmitting(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to switch profile");
      setIsSubmitting(false);
    }
  };

  if (!props.isOpen) return null;

  return (
    <div ref={containerRef} className="absolute top-full mt-2 right-0 z-50 w-48">
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
        {error && (
          <div className="p-2 bg-red-50 border-b border-red-200">
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        <div className="max-h-64 overflow-y-auto">
          {props.profiles.map((profile) => {
            const isCurrent = profile.id === props.currentProfileId;
            const emoji = profile.type === "parent" ? "🧑" : "👦";

            return (
              <button
                key={profile.id}
                onClick={() => handleSelect(profile.id)}
                disabled={isSubmitting || isCurrent}
                className={`w-full px-4 py-3 text-left transition text-sm flex items-center gap-2 ${
                  isCurrent
                    ? "bg-blue-100 text-blue-900 font-semibold"
                    : "hover:bg-gray-100 text-gray-900"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span className="text-base">{emoji}</span>
                <span className="flex-1">{profile.name}</span>
                {isCurrent && <span className="text-xs ml-auto">✓</span>}
              </button>
            );
          })}
        </div>

        {isSubmitting && (
          <div className="p-2 bg-gray-100 text-center">
            <p className="text-xs text-gray-600">Switching...</p>
          </div>
        )}
      </div>
    </div>
  );
}
