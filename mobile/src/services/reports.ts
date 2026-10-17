import { addDoc, collection } from "firebase/firestore";
import { ContentReport, ReportedEntityType, ReportStatus } from "../types/models";
import { getFirebaseClientFirestore } from "./firebaseClient";

export interface NewReportInput {
  reporterId: string;
  entityType: ReportedEntityType;
  entityId: string;
  ownerId?: string;
  reason: string;
  details?: string;
}

/** Saves a user report so admins can review it in the dashboard. */
export async function createFirebaseReport(input: NewReportInput): Promise<ContentReport> {
  const db = getFirebaseClientFirestore();
  if (!db) {
    throw new Error("Reports need an internet connection.");
  }
  const report = {
    reporterId: input.reporterId,
    entityType: input.entityType,
    entityId: input.entityId,
    ownerId: input.ownerId ?? null,
    reason: input.reason,
    details: input.details?.trim() || null,
    status: "open" as ReportStatus,
    createdAt: new Date().toISOString(),
  };
  const ref = await addDoc(collection(db, "reports"), report);
  return {
    id: ref.id,
    reporterId: report.reporterId,
    entityType: report.entityType,
    entityId: report.entityId,
    ownerId: input.ownerId,
    reason: report.reason,
    details: report.details ?? undefined,
    status: report.status,
    createdAt: report.createdAt,
  };
}

export function normalizeReport(raw: Record<string, unknown>): ContentReport | null {
  const entityType = raw.entityType;
  if (entityType !== "post" && entityType !== "reel" && entityType !== "story" && entityType !== "user") {
    return null;
  }
  const status = raw.status === "reviewed" || raw.status === "resolved" ? raw.status : "open";
  return {
    id: String(raw.id ?? ""),
    reporterId: String(raw.reporterId ?? ""),
    entityType,
    entityId: String(raw.entityId ?? ""),
    ownerId: typeof raw.ownerId === "string" ? raw.ownerId : undefined,
    reason: String(raw.reason ?? ""),
    details: typeof raw.details === "string" ? raw.details : undefined,
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    status,
  };
}
