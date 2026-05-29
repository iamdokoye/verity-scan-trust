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
    role: "super_admin" | "admin" | "student";
    institutionId?: string;
  }>("/auth/me");
}

export type SignupPayload = {
  email: string;
  password: string;
  fullName: string;
  institutionId: string;
};

export async function apiSignup(payload: SignupPayload): Promise<{ message: string }> {
  return api.post<{ message: string }>("/auth/signup", {
    body: payload,
    noAuth: true,
  });
}

export type PublicInstitution = {
  id: string;
  name: string;
  acronym: string;
  state: string | null;
};

export async function apiListInstitutionsPublic(): Promise<PublicInstitution[]> {
  return api.get<PublicInstitution[]>("/institution/list", { noAuth: true });
}

// ── Super-admin types ────────────────────────────────────────────────────────

export type AuditEntry = {
  id: string;
  action: string;
  severity: "info" | "warning" | "critical";
  actorId: string | null;
  actorRole: string | null;
  targetType: string | null;
  targetId: string | null;
  ipAddress: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: { email: string; fullName: string | null; role?: string } | null;
};

export type PaginatedAuditEntries = {
  items: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
};

export type PlatformStats = {
  totalInstitutions: number;
  totalStudents: number;
  totalDocuments: number;
  totalVerifications: number;
  documentsByStatus: Record<string, number>;
  recentAlerts: AuditEntry[];
  recentActivity: AuditEntry[];
};

export type Institution = {
  id: string;
  name: string;
  acronym: string;
  state: string | null;
  adminEmail: string | null;
  publicKeyPem: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { students: number; documents: number };
};

export async function apiGetPlatformStats(): Promise<PlatformStats> {
  return api.get<PlatformStats>("/super-admin/stats");
}

export async function apiListAuditLogs(params: {
  page?: number;
  pageSize?: number;
  action?: string;
  from?: string;
  to?: string;
  q?: string;
} = {}): Promise<PaginatedAuditEntries> {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("pageSize", String(params.pageSize ?? 50));
  if (params.action) query.set("action", params.action);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.q) query.set("q", params.q);

  const token = tokenStore.get();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}/audit-logs?${query.toString()}`, {
    method: "GET",
    headers,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      res.status,
      json?.error?.code,
      json?.error?.message ?? `HTTP ${res.status}`
    );
  }

  return {
    items: (json.data as AuditEntry[]) ?? [],
    total: (json.meta?.total as number) ?? 0,
    page: (json.meta?.page as number) ?? params.page ?? 1,
    pageSize: (json.meta?.pageSize as number) ?? params.pageSize ?? 50,
  };
}

export async function apiListInstitutions(): Promise<Institution[]> {
  return api.get<Institution[]>("/institution/all");
}

export async function apiCreateInstitution(body: {
  name: string;
  acronym: string;
  state?: string;
}): Promise<Institution> {
  return api.post<Institution>("/institution", { body });
}

export async function apiUpdateInstitution(
  id: string,
  body: Partial<{ name: string; acronym: string; state: string }>,
): Promise<Institution> {
  return api.patch<Institution>(`/institution/${id}`, { body });
}

export async function apiProvisionAdmin(
  institutionId: string,
  body: { email: string; fullName: string },
): Promise<{ userId: string; email: string; inviteUrl: string }> {
  return api.post(`/institution/${institutionId}/admins`, { body });
}

export async function apiSuspendInstitution(id: string): Promise<Institution> {
  return api.patch<Institution>(`/institution/${id}/suspend`);
}

export async function apiReactivateInstitution(id: string): Promise<Institution> {
  return api.patch<Institution>(`/institution/${id}/reactivate`);
}

export async function apiDeleteInstitution(id: string): Promise<void> {
  return api.delete(`/institution/${id}`);
}

// ── Students ─────────────────────────────────────────────────────────────────

export type Student = {
  id: string;
  fullName: string;
  matricNumber: string;
  email: string | null;
  phone: string | null;
  departmentId: string | null;
  department: { name: string } | null;
  institutionId: string;
  graduationYear: number | null;
  admissionYear: number | null;
  profileId: string | null;
  createdAt: string;
};

export type StudentDetail = Student & {
  cgpa: number;
  degreeClass: string | null;
  institution: { name: string; acronym: string };
};

export async function apiListStudents(q?: string): Promise<Student[]> {
  const qs = q ? `?q=${encodeURIComponent(q)}` : "";
  return api.get<Student[]>(`/students${qs}`);
}

export async function apiGetStudent(id: string): Promise<StudentDetail> {
  return api.get<StudentDetail>(`/students/${id}`);
}

/** Student self-lookup — returns the current user's own student record. */
export async function apiGetMyStudent(): Promise<StudentDetail> {
  return api.get<StudentDetail>("/students/me");
}

// ── Results (academic summary) ────────────────────────────────────────────────

export type CourseResult = {
  id: string;
  grade: string;
  gradePoint: number;
  course: { code: string; title: string; creditUnits: number };
};

export type SessionGroup = {
  sessionLabel: string;
  semester: string;
  gpa: number;
  results: CourseResult[];
};

export type AcademicSummary = {
  cgpa: number;
  degreeClass: string | null;
  sessions: SessionGroup[];
  totalResults: number;
};

export async function apiGetStudentResults(studentId: string): Promise<AcademicSummary> {
  return api.get<AcademicSummary>(`/results/students/${studentId}`);
}

// ── Documents ─────────────────────────────────────────────────────────────────

export type DocumentStatus =
  | "pending_approval"
  | "approved"
  | "rejected"
  | "superseded"
  | "revoked";

export type DocumentType = "degree_certificate" | "transcript" | "other";

export type VottaDocument = {
  id: string;
  documentType: DocumentType;
  status: DocumentStatus;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  sha256Hash: string | null;
  signedAt: string | null;
  createdAt: string;
  verificationToken: string | null;
  qrCodeBase64: string | null;
  approvalNote: string | null;
  supersessionReason: string | null;
  revocationReason: string | null;
  student?: { fullName: string; matricNumber: string };
  uploader?: { fullName: string | null; email: string };
};

export async function apiUploadDocument(
  studentId: string,
  formData: FormData
): Promise<VottaDocument> {
  return api.post<VottaDocument>(`/documents/students/${studentId}`, {
    body: formData,
  });
}

export async function apiGetStudentDocuments(
  studentId: string
): Promise<VottaDocument[]> {
  return api.get<VottaDocument[]>(`/documents/students/${studentId}`);
}

export async function apiListPendingDocuments(page = 1): Promise<{
  items: VottaDocument[];
  total: number;
  pageSize: number;
}> {
  const token = tokenStore.get();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(
    `${BASE_URL}/documents/pending?page=${page}&pageSize=20`,
    { method: "GET", headers }
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      res.status,
      json?.error?.code,
      json?.error?.message ?? `HTTP ${res.status}`
    );
  }
  return {
    items: (json.data as VottaDocument[]) ?? [],
    total: (json.meta?.total as number) ?? 0,
    pageSize: (json.meta?.pageSize as number) ?? 20,
  };
}

export async function apiApproveDocument(
  documentId: string,
  approvalNote?: string
): Promise<VottaDocument> {
  return api.patch<VottaDocument>(`/documents/${documentId}/approve`, {
    body: { approvalNote },
  });
}

export async function apiRejectDocument(
  documentId: string,
  rejectionReason: string
): Promise<VottaDocument> {
  return api.patch<VottaDocument>(`/documents/${documentId}/reject`, {
    body: { rejectionReason },
  });
}

export async function apiRevokeDocument(
  documentId: string,
  revocationReason: string
): Promise<VottaDocument> {
  return api.patch<VottaDocument>(`/documents/${documentId}/revoke`, {
    body: { revocationReason },
  });
}

export async function apiGetDocumentDownloadUrl(
  documentId: string
): Promise<{ url: string; expiresIn: number }> {
  return api.get<{ url: string; expiresIn: number }>(
    `/documents/${documentId}/download`
  );
}

// ── Admin stats ───────────────────────────────────────────────────────────────

export type AdminStats = {
  totalStudents: number;
  totalDocuments: number;
  pendingDocuments: number;
  verificationsToday: number;
  recentActivity: Array<{
    id: string;
    action: string;
    createdAt: string;
    actor: { fullName: string | null; email: string } | null;
  }>;
};

export async function apiGetAdminStats(): Promise<AdminStats> {
  return api.get<AdminStats>("/admin/stats");
}

// ── Academic sessions ─────────────────────────────────────────────────────────

export type AcademicSession = {
  id: string;
  label: string;
  semester: string;
  institutionId: string;
};

export async function apiListSessions(): Promise<AcademicSession[]> {
  return api.get<AcademicSession[]>("/sessions");
}

// ── Results ───────────────────────────────────────────────────────────────────

export type Grade = "A" | "B" | "C" | "D" | "E" | "F";

export type Course = {
  id: string;
  code: string;
  title: string;
  units: number;
  departmentId: string;
};

export async function apiListCourses(departmentId?: string): Promise<Course[]> {
  const qs = departmentId ? `?departmentId=${departmentId}` : "";
  return api.get<Course[]>(`/courses${qs}`);
}

export async function apiBulkSaveResults(
  results: Array<{
    studentId: string;
    sessionId: string;
    courseId: string;
    grade: Grade;
  }>
): Promise<{ count: number }> {
  return api.post<{ count: number }>("/results/bulk", { body: { results } });
}
