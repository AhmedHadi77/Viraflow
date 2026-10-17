import { Request, Response } from "express";
import { z } from "zod";
import { createStory, deleteStory, listStories, markStoryViewed, toggleStoryHighlight } from "../data/mockDb";
import { AuthenticatedRequest } from "../middleware/auth";
import { getOrCreateAuthenticatedUser } from "../services/authenticatedUserService";
import { buildStoryPayload } from "./helpers";
import { isSupportedImageSource, rejectIfSexualContent, rejectIfSexualMedia } from "./contentSafety";

const createStorySchema = z.object({
  imageUrl: z.string().refine((value) => isSupportedImageSource(value), "Invalid story image"),
  mediaType: z.enum(["image", "video"]).optional(),
  videoUrl: z.string().url().optional(),
  videoDurationSeconds: z.number().positive().max(180).optional(),
  caption: z.string().min(1).max(160).optional(),
  saveToHighlights: z.boolean().optional(),
  highlightLabel: z.string().min(1).max(30).optional(),
});

const highlightStorySchema = z.object({
  highlighted: z.boolean(),
  highlightLabel: z.string().min(1).max(30).optional(),
});

export function getStories(_req: Request, res: Response) {
  res.json({
    stories: listStories().map(buildStoryPayload),
  });
}

export async function postStory(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  const parsed = createStorySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(parsed.error.flatten());
    return;
  }

  if (rejectIfSexualContent(res, [parsed.data.caption, parsed.data.imageUrl])) {
    return;
  }

  if (
    await rejectIfSexualMedia(res, [
      { type: "image", url: parsed.data.imageUrl, label: "story image" },
      parsed.data.mediaType === "video" && parsed.data.videoUrl
        ? { type: "video", url: parsed.data.videoUrl, seconds: parsed.data.videoDurationSeconds, label: "story video" }
        : undefined,
    ])
  ) {
    return;
  }

  const story = createStory(userId, parsed.data);
  res.status(201).json({
    story: buildStoryPayload(story),
  });
}

export function viewStory(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  const story = markStoryViewed(req.params.storyId, userId);
  if (!story) {
    res.status(404).json({ message: "Story not found." });
    return;
  }

  res.json({
    story: buildStoryPayload(story),
  });
}

export function highlightStory(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  const parsed = highlightStorySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(parsed.error.flatten());
    return;
  }

  const story = toggleStoryHighlight(req.params.storyId, userId, parsed.data);
  if (!story) {
    res.status(404).json({ message: "Story not found." });
    return;
  }

  res.json({
    story: buildStoryPayload(story),
  });
}

export function removeStory(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  const actingUser = getOrCreateAuthenticatedUser(req.user!);
  const deleted = deleteStory(req.params.storyId, userId, { allowAdmin: actingUser.role === "admin" });
  if (!deleted) {
    res.status(404).json({ message: "Story not found." });
    return;
  }

  res.json({ ok: true });
}
