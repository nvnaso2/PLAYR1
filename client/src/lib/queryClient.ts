import { QueryClient, QueryCache, MutationCache, QueryFunction } from "@tanstack/react-query";

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

function handle401(error: unknown) {
  if (error instanceof Error && error.message.startsWith("401:")) {
    window.location.href = "/auth";
  }
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
