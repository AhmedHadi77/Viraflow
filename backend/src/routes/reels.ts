import { Router } from "express";
import {
  boostReel,
  createBoostCheckoutSession,
  createComment,
  getReelBoosts,
  getReelDetails,
  getReels,
  likeReel,
  postReel,
  repost,
} from "../controllers/reelController";
import { toggleSavedReel } from "../controllers/savedController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", getReels);
router.get("/boosts", getReelBoosts);
router.get("/:id", getReelDetails);
router.post("/", requireAuth, postReel);
router.post("/:id/like", requireAuth, likeReel);
router.post("/:id/comments", requireAuth, createComment);
router.post("/:id/repost", requireAuth, repost);
router.post("/:id/boost/checkout-session", requireAuth, createBoostCheckoutSession);
router.post("/:id/boost", requireAuth, boostReel);
router.post("/:id/save", requireAuth, toggleSavedReel);

export { router as reelsRouter };
