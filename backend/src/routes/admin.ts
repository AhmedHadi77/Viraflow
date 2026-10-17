import { Router } from "express";
import {
  adminBroadcast,
  adminBroadcasts,
  adminCalls,
  adminDeleteUser,
  adminMe,
  adminOverview,
  adminReports,
  adminSetBan,
  adminSetRole,
  adminUpdateReport,
  requireAdmin,
} from "../controllers/adminController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/me", requireAuth, adminMe);
router.get("/overview", requireAuth, requireAdmin, adminOverview);
router.get("/calls", requireAuth, requireAdmin, adminCalls);
router.get("/reports", requireAuth, requireAdmin, adminReports);
router.patch("/reports/:id", requireAuth, requireAdmin, adminUpdateReport);
router.post("/users/:id/role", requireAuth, requireAdmin, adminSetRole);
router.post("/users/:id/ban", requireAuth, requireAdmin, adminSetBan);
router.delete("/users/:id", requireAuth, requireAdmin, adminDeleteUser);
router.get("/broadcasts", requireAuth, requireAdmin, adminBroadcasts);
router.post("/broadcast", requireAuth, requireAdmin, adminBroadcast);

export { router as adminRouter };
