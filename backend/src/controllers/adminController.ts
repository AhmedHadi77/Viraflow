import { NextFunction, Response } from "express";
import { z } from "zod";
import { AuthenticatedRequest } from "../middleware/auth";
import {
  AdminActor,
  AdminError,
  broadcastToAllUsers,
  canManageRoles,
  deleteUserAccount,
  getAdminOverview,
  listBroadcasts,
  listRecentCalls,
  listReports,
  resolveAdminActor,
  setReportStatus,
  setUserBanned,
  setUserRole,
} from "../services/adminService";

type AdminRequest = AuthenticatedRequest & { admin?: AdminActor };

function sendError(res: Response, error: unknown) {
  if (error instanceof AdminError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }
  console.error("Admin action failed.", error);
  res.status(500).json({ message: "The admin action failed. Please try again." });
}

/** Lets only admins (and the owner) through. */
export async function requireAdmin(req: AdminRequest, res: Response, next: NextFunction) {
  if (!req.user?.id) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }
  try {
    const actor = await resolveAdminActor({ id: req.user.id, email: req.user.email });
    if (!actor.isAdmin) {
      res.status(403).json({ message: "Admin access only." });
      return;
    }
    req.admin = actor;
    next();
  } catch (error) {
    sendError(res, error);
  }
}

export async function adminMe(req: AuthenticatedRequest, res: Response) {
  if (!req.user?.id) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }
  try {
    const actor = await resolveAdminActor({ id: req.user.id, email: req.user.email });
    res.json({ isAdmin: actor.isAdmin, isOwner: actor.isOwner, canManageRoles: canManageRoles(actor) });
  } catch (error) {
    sendError(res, error);
  }
}

export async function adminOverview(_req: AdminRequest, res: Response) {
  try {
    res.json(await getAdminOverview());
  } catch (error) {
    sendError(res, error);
  }
}

export async function adminCalls(_req: AdminRequest, res: Response) {
  try {
    res.json({ calls: await listRecentCalls(100) });
  } catch (error) {
    sendError(res, error);
  }
}

export async function adminReports(_req: AdminRequest, res: Response) {
  try {
    res.json({ reports: await listReports(300) });
  } catch (error) {
    sendError(res, error);
  }
}

const reportStatusSchema = z.object({ status: z.enum(["open", "reviewed", "resolved"]) });

export async function adminUpdateReport(req: AdminRequest, res: Response) {
  const parsed = reportStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(parsed.error.flatten());
    return;
  }
  try {
    await setReportStatus(req.params.id, parsed.data.status);
    res.json({ ok: true });
  } catch (error) {
    sendError(res, error);
  }
}

const roleSchema = z.object({ role: z.enum(["admin", "user"]) });

export async function adminSetRole(req: AdminRequest, res: Response) {
  const parsed = roleSchema.safeParse(req.body);
  if (!parsed.success || !req.admin) {
    res.status(400).json({ message: "Choose admin or user." });
    return;
  }
  try {
    await setUserRole(req.admin, req.params.id, parsed.data.role);
    res.json({ ok: true });
  } catch (error) {
    sendError(res, error);
  }
}

const banSchema = z.object({ banned: z.boolean() });

export async function adminSetBan(req: AdminRequest, res: Response) {
  const parsed = banSchema.safeParse(req.body);
  if (!parsed.success || !req.admin) {
    res.status(400).json({ message: "Invalid request." });
    return;
  }
  try {
    await setUserBanned(req.admin, req.params.id, parsed.data.banned);
    res.json({ ok: true });
  } catch (error) {
    sendError(res, error);
  }
}

export async function adminDeleteUser(req: AdminRequest, res: Response) {
  if (!req.admin) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }
  try {
    const removed = await deleteUserAccount(req.admin, req.params.id);
    res.json({ ok: true, removed });
  } catch (error) {
    sendError(res, error);
  }
}

const broadcastSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(240),
});

export async function adminBroadcast(req: AdminRequest, res: Response) {
  const parsed = broadcastSchema.safeParse(req.body);
  if (!parsed.success || !req.admin) {
    res.status(400).json({ message: "Add a title (max 120 characters) and a message (max 240)." });
    return;
  }
  try {
    res.status(201).json(await broadcastToAllUsers(req.admin, parsed.data));
  } catch (error) {
    sendError(res, error);
  }
}

export async function adminBroadcasts(_req: AdminRequest, res: Response) {
  try {
    res.json({ broadcasts: await listBroadcasts(20) });
  } catch (error) {
    sendError(res, error);
  }
}
