import { getCurrentFirebaseIdToken } from "./firebaseProfiles";
import { getPublicApiBaseUrl } from "./publicEnv";

// Admin dashboard API. Every call is checked on the server (Firebase Admin), so only admins can use it.

export interface AdminOverview {
  generatedAt: string;
  totals: {
    users: number;
    admins: number;
    banned: number;
    newUsers7d: number;
    posts: number;
    reels: number;
    stories: number;
    products: number;
    communities: number;
    chats: number;
    directThreads: number;
    marketplaceThreads: number;
    messages: number;
    messages24h: number;
    orders: number;
    calls: number;
    calls7d: number;
    videoCalls: number;
    voiceCalls: number;
    completedCalls: number;
    reportsOpen: number;
    reportsTotal: number;
    comments: number;
    pushDevices: number;
  };
  series: {
    days: string[];
    signups: number[];
    posts: number[];
    messages: number[];
    calls: number[];
    reports: number[];
  };
}

export interface AdminCallRow {
  id: string;
  callerId: string;
  calleeId: string;
  type: "audio" | "video";
  status: string;
  createdAt: string;
  durationSeconds?: number;
}

export interface AdminBroadcastRow {
  id: string;
  title: string;
  body: string;
  recipients: number;
  pushed: number;
  createdAt: string;
}

async function adminRequest<T>(path: string, init?: { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown }) {
  const base = getPublicApiBaseUrl();
  if (!base) {
    throw new Error("The server address is missing from this build.");
  }
  const token = await getCurrentFirebaseIdToken(false).catch(() => null);
  if (!token) {
    throw new Error("Please log in again to use the admin dashboard.");
  }
  const response = await fetch(`${base}/admin${path}`, {
    method: init?.method ?? "GET",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  if (!response.ok) {
    let message = `Admin request failed (${response.status}).`;
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) {
        message = body.message;
      }
    } catch {
      if (response.status === 404) {
        message = "The server hasn't been updated with the admin tools yet. Deploy the latest backend.";
      }
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

export const adminApi = {
  me: () => adminRequest<{ isAdmin: boolean; isOwner: boolean; canManageRoles?: boolean }>("/me"),
  overview: () => adminRequest<AdminOverview>("/overview"),
  calls: () => adminRequest<{ calls: AdminCallRow[] }>("/calls").then((body) => body.calls),
  reports: () => adminRequest<{ reports: Array<Record<string, unknown>> }>("/reports").then((body) => body.reports),
  setReportStatus: (reportId: string, status: "open" | "reviewed" | "resolved") =>
    adminRequest(`/reports/${encodeURIComponent(reportId)}`, { method: "PATCH", body: { status } }),
  setRole: (userId: string, role: "admin" | "user") =>
    adminRequest(`/users/${encodeURIComponent(userId)}/role`, { method: "POST", body: { role } }),
  setBan: (userId: string, banned: boolean) =>
    adminRequest(`/users/${encodeURIComponent(userId)}/ban`, { method: "POST", body: { banned } }),
  deleteUser: (userId: string) => adminRequest(`/users/${encodeURIComponent(userId)}`, { method: "DELETE" }),
  broadcast: (title: string, body: string) =>
    adminRequest<{ recipients: number; pushed: number }>("/broadcast", { method: "POST", body: { title, body } }),
  broadcasts: () => adminRequest<{ broadcasts: AdminBroadcastRow[] }>("/broadcasts").then((body) => body.broadcasts),
};
