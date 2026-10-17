import { Router } from "express";
import { getStories, highlightStory, postStory, removeStory, viewStory } from "../controllers/storyController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", getStories);
router.post("/", requireAuth, postStory);
router.patch("/:storyId/view", requireAuth, viewStory);
router.patch("/:storyId/highlight", requireAuth, highlightStory);
router.delete("/:storyId", requireAuth, removeStory);

export { router as storiesRouter };
