"use client";
import { useState } from "react";
import { ProfileGateCard } from "@/app/home/components/ProfileGateCard";
import { apiPatch } from "@/app/client/api";

export default function CompleteProfilePage() {
  const [profileGroup, setProfileGroup] = useState("");
  const [profileMemberType, setProfileMemberType] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [msg, setMsg] = useState("");

  async function saveProfile() {
    if (!profileGroup || !profileMemberType) {
      setMsg("Please select your group and member type");
      return;
    }
    setSavingProfile(true);
    try {
      await apiPatch("/api/profile", {
        group: profileGroup,
        member_type: profileMemberType,
        phone: profilePhone || undefined,
      });
      window.location.href = "/home";
    } catch (e) {
      setMsg("Failed to save profile");
    } finally {
      setSavingProfile(false);
    }
  }

  function signOut() {
    window.location.href = "/api/auth/sessionLogout";
  }

  return (
    <ProfileGateCard
      msg={msg}
      profileGroup={profileGroup}
      setProfileGroup={setProfileGroup}
      profileMemberType={profileMemberType}
      setProfileMemberType={setProfileMemberType}
      profilePhone={profilePhone}
      setProfilePhone={setProfilePhone}
      savingProfile={savingProfile}
      onSave={saveProfile}
      onSignOut={signOut}
    />
  );
}
