import { Router } from "express";
import {
  getCommunities,
  getCommunity,
  getCommunityActivity,
  postCommunity,
  postCommunityChatMessage,
  postCommunityPost,
} from "../controllers/communityController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", getCommunities);
router.get("/:id", getCommunity);
router.get("/:id/activity", requireAuth, getCommunityActivity);
router.post("/", requireAuth, postCommunity);
router.post("/:id/posts", requireAuth, postCommunityPost);
router.post("/:id/chat", requireAuth, postCommunityChatMessage);

export { router as communitiesRouter };
