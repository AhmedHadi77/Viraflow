import { Router } from "express";
import { getMySavedPosts } from "../controllers/savedController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/me", requireAuth, getMySavedPosts);

export { router as savedRouter };
