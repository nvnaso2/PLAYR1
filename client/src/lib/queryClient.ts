import { QueryClient, QueryCache, MutationCache, QueryFunction } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";

const NATIVE_API_BASE = "https://PLAYR1Basketball.replit.app";
const TOKEN_KEY = "playr1_auth_token";

function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.protocol === "capacitor:" || window.location.protocol === "ionic:";
}

function getApiBase(): string {
  return isNativeApp() ? NATIVE_API_BASE : (import.meta.env.VITE_API_BASE_URL || "");
}

export function storeAuthToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) return { Authorization: `Bearer ${token}` };
  return {};
}

export function buildUrl(url: string): string {
  if (url.startsWith("http")) return url;
  return `${getApiBase()}${url}`;
}

/**
 * Compute the start-of-period timestamp (epoch ms) in the user's local
 * timezone. Stats endpoints accept this so "today / this week / this month"
 * boundaries roll over at the user's midnight rather than UTC midnight.
 */
export function periodStartTs(period: string = "weekly"): number {
  const now = new Date();
  const d = new Date(now);
  switch (period) {
    case "daily":
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    case "weekly":
      d.setDate(d.getDate() - 7);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    case "monthly":
      d.setMonth(d.getMonth() - 1);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    case "annual":
      d.setFullYear(d.getFullYear() - 1);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    default:
      d.setDate(d.getDate() - 7);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
  }
}

/** Build a stats URL with period + local-tz startTs auto-appended. */
export function statsUrl(path: string, period: string = "weekly"): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}period=${encodeURIComponent(period)}&startTs=${periodStartTs(period)}`;
}

export async function nativeFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers as Record<string, string> || {}),
  };
  return fetch(buildUrl(url), { credentials: "include", ...options, headers });
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Guard so multiple simultaneous 401s only trigger one redirect
let _redirectingToAuth = false;

function handle401(error: unknown) {
  if (error instanceof Error && error.message.startsWith("401:")) {
    // Don't hard-redirect if we have a stored token — this is a race condition
    // (e.g. a pre-login in-flight request completing after login on iOS).
    if (localStorage.getItem(TOKEN_KEY)) return;
    // Already on auth page — nothing to do.
    if (window.location.pathname === "/auth") return;
    // Lead magnets are intentionally public; background authenticated queries
    // must not interrupt a guest while they are taking a diagnostic.
    if (
      window.location.pathname === "/lead-magnets" ||
      window.location.pathname.startsWith("/lead-magnets/")
    ) return;
    // Only redirect once; multiple in-flight 401s after logout cause a cascade loop.
    if (_redirectingToAuth) return;
    _redirectingToAuth = true;
    window.location.href = "/auth";
  }
}

/**
 * Convert a relative /objects/... path to an absolute URL on iOS native,
 * where WKWebView can struggle with relative src attributes for media elements.
 */
export function getObjectUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  const rel = path.startsWith("/objects/") ? path : `/objects/${path.replace(/^\//, "")}`;
  if (Capacitor.isNativePlatform()) return `${NATIVE_API_BASE}${rel}`;
  return rel;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(buildUrl(url), {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...getAuthHeaders(),
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = buildUrl(queryKey.join("/") as string);
    const res = await fetch(url, {
      credentials: "include",
      headers: getAuthHeaders(),
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => handle401(error),
  }),
  mutationCache: new MutationCache({
    onError: (error) => handle401(error),
  }),
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
