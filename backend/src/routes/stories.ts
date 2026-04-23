import { Router } from "express";
import { getStories, postStory } from "../controllers/storyController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", getStories);
router.post("/", requireAuth, postStory);

export { router as storiesRouter };
