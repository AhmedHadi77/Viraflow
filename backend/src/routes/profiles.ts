import { Router } from "express";
import {
  getMyProfile,
  getPublicProfile,
  setUserBanStatusAdmin,
  toggleFollowUser,
  updateMyProfile,
} from "../controllers/profileController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/me", requireAuth, getMyProfile);
router.patch("/me", requireAuth, updateMyProfile);
router.get("/users/:id", getPublicProfile);
router.patch("/users/:id/ban", requireAuth, setUserBanStatusAdmin);
router.post("/users/:id/follow", requireAuth, toggleFollowUser);

export { router as profileRouter };
