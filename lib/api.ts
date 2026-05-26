/**
 * Votta API client
 *
 * All requests go through the Express backend at NEXT_PUBLIC_API_URL.
 * Supabase is never called directly from the frontend — only the backend
 * talks to Supabase (storage, auth).
 */

const BASE_URL =
  (process.env.NEXT_PUBLIC_API_URL as string) ?? "http://localhost:3000/api/v1";

let _accessToken: string | null = null;

export const tokenStore = {
  get(): string | null {
    if (_accessToken) return _accessToken;
    try {
      _accessToken = localStorage.getItem("votta_token");
    } catch {
      // localStorage not available (SSR context)
    }
    return _accessToken;
  },
  set(token: string): void {
    _accessToken = token;
    try {
      localStorage.setItem("votta_token", token);
    } catch {
      // ignore
    }
  },
  clear(): void {
    _accessToken = null;
    try {
      localStorage.removeItem("votta_token");
      localStorage.removeItem("votta_refresh_token");
    } catch {
      // ignore
    }
  },
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string | undefined,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = {
  body?: BodyInit | Record<string, unknown>;
  headers?: Record<string, string>;
  noAuth?: boolean;
};

async function request<T>(
  method: string,
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = { ...options.headers };

  const token = tokenStore.get();
  if (token && !options.noAuth) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let body: BodyInit | undefined;
  if (options.body instanceof FormData) {
    body = options.body;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  const res = await fetch(`${BASE_URL}${path}`, { method, headers, body });

  if (res.status === 204) return undefined as T;

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      res.status,
      json?.error?.code,
      json?.error?.message ?? `HTTP ${res.status}`
    );
  }

  return (json as { data: T }).data;
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) =>
    request<T>("GET", path, opts),
  post: <T>(path: string, opts?: RequestOptions) =>
    request<T>("POST", path, opts),
  patch: <T>(path: string, opts?: RequestOptions) =>
    request<T>("PATCH", path, opts),
  put: <T>(path: string, opts?: RequestOptions) =>
    request<T>("PUT", path, opts),
  delete: <T>(path: string, opts?: RequestOptions) =>
    request<T>("DELETE", path, opts),
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
  };
};

export async function apiLogin(
  email: string,
  password: string
): Promise<LoginResponse> {
  const data = await api.post<LoginResponse>("/auth/login", {
    body: { email, password },
    noAuth: true,
  });
  tokenStore.set(data.accessToken);
  try {
    localStorage.setItem("votta_refresh_token", data.refreshToken);
  } catch {}
  return data;
}

export async function apiLogout(): Promise<void> {
  try {
    await api.post("/auth/logout");
  } catch {
    // Even if the server call fails, clear local tokens
  }
  tokenStore.clear();
}

export async function apiRefresh(): Promise<string | null> {
  let refreshToken: string | null = null;
  try {
    refreshToken = localStorage.getItem("votta_refresh_token");
  } catch {}
  if (!refreshToken) return null;

  try {
    const data = await api.post<LoginResponse>("/auth/refresh", {
      body: { refreshToken },
      noAuth: true,
    });
    tokenStore.set(data.accessToken);
    try {
      localStorage.setItem("votta_refresh_token", data.refreshToken);
    } catch {}
    return data.accessToken;
  } catch {
    tokenStore.clear();
    return null;
  }
}

export async function apiGetMe() {
  return api.get<{
    id: string;
    email: string;
    role: string;
    institutionId: string;
  }>("/auth/me");
}
