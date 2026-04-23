import { Request, Response } from "express";
import { z } from "zod";
import {
  addCommunityChatMessage,
  addCommunityPost,
  canAccessCommunity,
  createCommunity,
  getCommunityById,
  listCommunities,
  listCommunityChatMessages,
  listCommunityPosts,
} from "../data/mockDb";
import { AuthenticatedRequest } from "../middleware/auth";
import { emitCommunityMessageRealtime } from "../realtime/socketServer";
import { buildCommunityChatMessagePayload, buildCommunityPayload, buildCommunityPostPayload } from "./helpers";
import { isSupportedImageSource, rejectIfSexualContent, rejectIfSexualMedia } from "./contentSafety";

const createCommunitySchema = z.object({
  kind: z.enum(["page", "group", "channel"]),
  name: z.string().min(3),
  description: z.string().min(5),
  category: z.string().min(2),
  coverImage: z.string().refine((value) => isSupportedImageSource(value), "Invalid image"),
  visibility: z.enum(["public", "private"]),
});

const createCommunityPostSchema = z.object({
  text: z.string().min(1).max(1000),
  imageUrl: z
    .string()
    .refine((value) => !value || isSupportedImageSource(value), "Invalid image")
    .optional(),
});

const createCommunityChatMessageSchema = z.object({
  text: z.string().min(1).max(500),
});

export function getCommunities(_req: Request, res: Response) {
  res.json({
    communities: listCommunities().map(buildCommunityPayload),
  });
}

export function getCommunity(req: Request, res: Response) {
  const community = getCommunityById(req.params.id);
  if (!community) {
    res.status(404).json({ message: "Community not found." });
    return;
  }

  res.json({
    community: buildCommunityPayload(community),
  });
}

export function getCommunityActivity(req: AuthenticatedRequest, res: Response) {
  const community = getCommunityById(req.params.id);
  if (!community) {
    res.status(404).json({ message: "Community not found." });
    return;
  }

  if (!canAccessCommunity(req.user?.id, community)) {
    res.status(403).json({ message: "You do not have access to this community." });
    return;
  }

  res.json({
    community: buildCommunityPayload(community),
    posts: listCommunityPosts(community.id).map(buildCommunityPostPayload),
    chatMessages:
      community.kind === "group"
        ? listCommunityChatMessages(community.id).map(buildCommunityChatMessagePayload)
        : [],
  });
}

export async function postCommunity(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  const parsed = createCommunitySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(parsed.error.flatten());
    return;
  }

  if (rejectIfSexualContent(res, [parsed.data.name, parsed.data.description, parsed.data.category])) {
    return;
  }

  if (await rejectIfSexualMedia(res, [{ type: "image", url: parsed.data.coverImage, label: `${parsed.data.kind} cover image` }])) {
    return;
  }

  const community = createCommunity(userId, parsed.data);
  res.status(201).json({
    community: buildCommunityPayload(community),
  });
}

export async function postCommunityPost(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  const parsed = createCommunityPostSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(parsed.error.flatten());
    return;
  }

  if (rejectIfSexualContent(res, [parsed.data.text])) {
    return;
  }

  if (parsed.data.imageUrl) {
    if (await rejectIfSexualMedia(res, [{ type: "image", url: parsed.data.imageUrl, label: "community post image" }])) {
      return;
    }
  }

  const post = addCommunityPost(userId, req.params.id, parsed.data);
  if (!post) {
    res.status(403).json({ message: "You cannot post inside this community." });
    return;
  }

  res.status(201).json({
    post: buildCommunityPostPayload(post),
  });
}

export function postCommunityChatMessage(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  const parsed = createCommunityChatMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(parsed.error.flatten());
    return;
  }

  if (rejectIfSexualContent(res, [parsed.data.text])) {
    return;
  }

  const message = addCommunityChatMessage(userId, req.params.id, parsed.data.text);
  if (!message) {
    res.status(403).json({ message: "Group chat is only available to members inside groups." });
    return;
  }

  emitCommunityMessageRealtime(req.params.id, message);

  res.status(201).json({
    message: buildCommunityChatMessagePayload(message),
  });
}
