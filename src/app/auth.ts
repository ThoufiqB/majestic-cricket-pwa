"use client";

// Session-cookie auth: no client token storage.
// Keep these helpers so older imports don't break while we refactor.

export function saveToken(_: string) {
  // no-op
}

export function getToken(): string | null {
  return "session"; // truthy flag for old checks; do NOT use as a token
}

export async function signOutSession() {
  await fetch("/api/auth/sessionLogout", { method: "POST" });
}

export function clearToken() {
  // no-op (cookie cleared via sessionLogout)
}
