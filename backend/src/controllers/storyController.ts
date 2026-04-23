import { Request, Response } from "express";
import { z } from "zod";
import { createStory, listStories } from "../data/mockDb";
import { AuthenticatedRequest } from "../middleware/auth";
import { buildStoryPayload } from "./helpers";
import { isSupportedImageSource, rejectIfSexualContent, rejectIfSexualMedia } from "./contentSafety";

const createStorySchema = z.object({
  imageUrl: z.string().refine((value) => isSupportedImageSource(value), "Invalid story image"),
  caption: z.string().min(1).max(160).optional(),
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
    ])
  ) {
    return;
  }

  const story = createStory(userId, parsed.data);
  res.status(201).json({
    story: buildStoryPayload(story),
  });
}
