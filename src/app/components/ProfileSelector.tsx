"use client";

import { useState } from "react";
import type { KidsProfile } from "@/lib/types/kids";

export interface ProfileSelectorProps {
  playerId: string;
  playerName: string;
  playerEmail: string;
  kids: KidsProfile[];
  onSelect: (profileId: string) => Promise<void>;
}

export function ProfileSelector(props: ProfileSelectorProps) {
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSelect = async () => {
    if (!selectedProfileId) return;

    setIsSubmitting(true);
    setError("");

    try {
      await props.onSelect(selectedProfileId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to select profile");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#1e3a5f]/10 via-background to-[#1e3a5f]/20 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        {/* Header */}
        <h1 className="text-2xl font-bold text-[#1e3a5f] mb-2">
          Welcome back, {props.playerName}!
        </h1>
        <p className="text-gray-600 mb-6">
          Which profile would you like to use?
        </p>

        {/* Profile Selection Cards */}
        <div className="space-y-3 mb-6">
          {/* Own Profile */}
          <button
            onClick={() => setSelectedProfileId(props.playerId)}
            disabled={isSubmitting}
            className={`w-full p-4 rounded-lg border-2 transition text-left flex items-center gap-3 ${
              selectedProfileId === props.playerId
                ? "border-[#1e3a5f] bg-[#1e3a5f]/5"
                : "border-gray-200 hover:border-gray-300"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <div className="text-3xl">🧑</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900">My Profile</div>
              <div className="text-sm text-gray-600 truncate">{props.playerName}</div>
            </div>
            <div
              className={`w-5 h-5 border-2 rounded-full flex-shrink-0 flex items-center justify-center transition ${
                selectedProfileId === props.playerId
                  ? "border-[#1e3a5f] bg-[#1e3a5f]"
                  : "border-gray-300"
              }`}
            >
              {selectedProfileId === props.playerId && (
                <div className="w-2 h-2 bg-white rounded-full"></div>
              )}
            </div>
          </button>

          {/* Kid Profiles */}
          {props.kids.map((kid) => (
            <button
              key={kid.kid_id}
              onClick={() => setSelectedProfileId(kid.kid_id)}
              disabled={isSubmitting}
              className={`w-full p-4 rounded-lg border-2 transition text-left flex items-center gap-3 ${
                selectedProfileId === kid.kid_id
                  ? "border-[#1e3a5f] bg-[#1e3a5f]/5"
                  : "border-gray-200 hover:border-gray-300"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="text-3xl">👦</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900">
                  {kid.name} <span className="text-sm text-gray-600">(Age {kid.age})</span>
                </div>
                <div className="text-sm text-gray-500">DOB: {kid.date_of_birth}</div>
              </div>
              <div
                className={`w-5 h-5 border-2 rounded-full flex-shrink-0 flex items-center justify-center transition ${
                  selectedProfileId === kid.kid_id
                    ? "border-[#1e3a5f] bg-[#1e3a5f]"
                    : "border-gray-300"
                }`}
              >
                {selectedProfileId === kid.kid_id && (
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Continue Button */}
        <button
          onClick={handleSelect}
          disabled={!selectedProfileId || isSubmitting}
          className="w-full py-3 bg-[#1e3a5f] text-white rounded-lg font-semibold hover:bg-[#2d5a8a] transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Loading..." : "Continue"}
        </button>
      </div>
    </div>
  );
}
