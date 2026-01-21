export type ApiError = Error & { status?: number; payload?: any };

function makeError(message: string, status?: number, payload?: any): ApiError {
  const e = new Error(message) as ApiError;
  e.status = status;
  e.payload = payload;
  return e;
}

async function handle<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  if (!res.ok) {
    let payload: any = null;
    try {
      payload = isJson ? await res.json() : await res.text();
    } catch {
      // ignore
    }
    const msg =
      (payload && typeof payload === "object" && (payload.error || payload.message)) ||
      (typeof payload === "string" && payload) ||
      res.statusText ||
      "Request failed";
    throw makeError(String(msg), res.status, payload);
  }

  if (res.status === 204) return undefined as any;
  return (isJson ? res.json() : (res.text() as any)) as Promise<T>;
}

export async function apiGet<T = any>(url: string): Promise<T> {
  const res = await fetch(url, {
    method: "GET",
    credentials: "include", // IMPORTANT: send session cookies
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  return handle<T>(res);
}

export async function apiPost<T = any>(url: string, body?: any): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return handle<T>(res);
}

export async function apiPatch<T = any>(url: string, body?: any): Promise<T> {
  const res = await fetch(url, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return handle<T>(res);
}

export async function apiDelete<T = any>(url: string): Promise<T> {
  const res = await fetch(url, {
    method: "DELETE",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  return handle<T>(res);
}
