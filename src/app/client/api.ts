"use client";

export type ApiError = Error & { status?: number };

function makeError(message: string, status?: number): ApiError {
  const e = new Error(message) as ApiError;
  e.status = status;
  return e;
}

async function parseJsonSafe(res: Response) {
  const text = await res.text();
  try {
    return { data: JSON.parse(text), text };
  } catch {
    return { data: null, text };
  }
}

async function handle(res: Response) {
  const { data, text } = await parseJsonSafe(res);

  if (!res.ok) {
    const msg = String(data?.error || data?.message || `Request failed (${res.status})`);
    throw makeError(msg, res.status);
  }
  if (data?.error) {
    throw makeError(String(data.error), res.status);
  }
  if (!data) {
    throw makeError(`Non-JSON from server (first 200 chars): ${text.slice(0, 200)}`, res.status);
  }

  return data;
}

/**
 * Cookie-based API calls:
 * - session cookie automatically sent (credentials: "include")
 * - do NOT send idToken
 */
export async function apiGet(path: string) {
  const res = await fetch(path, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  return handle(res);
}

export async function apiPost(path: string, payload?: any) {
  const res = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload || {}),
  });
  return handle(res);
}

export async function apiPatch(path: string, payload?: any) {
  const res = await fetch(path, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload || {}),
  });
  return handle(res);
}

export async function apiDelete(path: string) {
  const res = await fetch(path, {
    method: "DELETE",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  return handle(res);
}
