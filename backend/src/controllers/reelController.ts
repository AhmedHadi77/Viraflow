import { Request, Response } from "express";
import { z } from "zod";
import {
  addComment,
  createReelBoost,
  createReel,
  getActiveBoostForReel,
  getReelById,
  getUserById,
  listCommentsByReel,
  listReelBoosts,
  listReels,
  repostReel,
  toggleLike,
} from "../data/mockDb";
import { AuthenticatedRequest } from "../middleware/auth";
import { getBillingReelById, getBillingUserById, hasActiveBillingBoostForReel } from "../services/billingService";
import { createBoostCheckoutSession as createStripeBoostCheckoutSession } from "../services/stripeService";
import { rejectIfSexualContent, rejectIfSexualMedia } from "./contentSafety";
import { buildCommentPayload, buildReelPayload } from "./helpers";

const createReelSchema = z.object({
  videoUrl: z.string().url(),
  caption: z.string().min(3),
  thumbnailUrl: z.string().url().optional(),
});

const commentSchema = z.object({
  text: z.string().min(1),
});

const boostSchema = z.object({
  planId: z.enum(["starter", "growth", "viral"]),
});

export function getReels(_req: Request, res: Response) {
  res.json({
    reels: listReels().map(buildReelPayload),
  });
}

export function getReelBoosts(_req: Request, res: Response) {
  res.json({
    boosts: listReelBoosts(),
  });
}

export function getReelDetails(req: Request, res: Response) {
  const reel = getReelById(req.params.id);
  if (!reel) {
    res.status(404).json({ message: "Reel not found." });
    return;
  }

  res.json({
    reel: buildReelPayload(reel),
    comments: listCommentsByReel(reel.id).map(buildCommentPayload),
  });
}

export async function postReel(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  const parsed = createReelSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(parsed.error.flatten());
    return;
  }

  if (rejectIfSexualContent(res, [parsed.data.caption, parsed.data.videoUrl, parsed.data.thumbnailUrl])) {
    return;
  }

  if (
    await rejectIfSexualMedia(res, [
      { type: "video", url: parsed.data.videoUrl, label: "reel video" },
      parsed.data.thumbnailUrl ? { type: "image", url: parsed.data.thumbnailUrl, label: "reel thumbnail" } : undefined,
    ])
  ) {
    return;
  }

  const reel = createReel(userId, parsed.data);
  res.status(201).json({
    reel: buildReelPayload(reel),
  });
}

export function likeReel(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  const reel = toggleLike(userId, req.params.id);
  if (!reel) {
    res.status(404).json({ message: "Reel not found." });
    return;
  }

  res.json({
    reel: buildReelPayload(reel),
  });
}

export function createComment(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  const parsed = commentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(parsed.error.flatten());
    return;
  }

  if (rejectIfSexualContent(res, [parsed.data.text])) {
    return;
  }

  const reel = getReelById(req.params.id);
  if (!reel) {
    res.status(404).json({ message: "Reel not found." });
    return;
  }

  const comment = addComment(userId, req.params.id, parsed.data.text);
  res.status(201).json({
    comment: buildCommentPayload(comment),
  });
}

export function repost(req: AuthenticatedRequest, res: Response) {
  if (!req.user?.id) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  const reel = repostReel(req.user.id, req.params.id);
  if (!reel) {
    res.status(404).json({ message: "Reel not found." });
    return;
  }

  res.json({
    reel: buildReelPayload(reel),
  });
}

export function boostReel(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  const parsed = boostSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(parsed.error.flatten());
    return;
  }

  const reel = getReelById(req.params.id);
  if (!reel) {
    res.status(404).json({ message: "Reel not found." });
    return;
  }

  if (reel.userId !== userId) {
    res.status(403).json({ message: "You can only boost your own reels." });
    return;
  }

  if (getActiveBoostForReel(reel.id)) {
    res.status(409).json({ message: "This reel already has an active boost running." });
    return;
  }

  const result = createReelBoost(
    userId,
    reel.id,
    parsed.data.planId,
    getUserById(userId)?.headline || "Short-form viewers who engage with creator-led content."
  );

  if (!result) {
    res.status(400).json({ message: "Boost plan not found." });
    return;
  }

  res.status(201).json({
    reel: buildReelPayload(result.reel),
    boost: result.boost,
  });
}

export async function createBoostCheckoutSession(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  const parsed = boostSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(parsed.error.flatten());
    return;
  }

  const reel = await getBillingReelById(req.params.id);
  if (!reel) {
    res.status(404).json({ message: "Reel not found." });
    return;
  }

  if (reel.userId !== userId) {
    res.status(403).json({ message: "You can only boost your own reels." });
    return;
  }

  if (await hasActiveBillingBoostForReel(reel.id)) {
    res.status(409).json({ message: "This reel already has an active boost running." });
    return;
  }

  try {
    const billingUser = await getBillingUserById(userId);
    const checkoutSession = await createStripeBoostCheckoutSession({
      userId,
      userEmail: billingUser?.email,
      reelId: reel.id,
      reelCaption: reel.caption,
      planId: parsed.data.planId,
    });

    res.status(201).json({
      message: "Stripe checkout session created.",
      status: "pending",
      ...checkoutSession,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Boost checkout could not be created.";
    const isConfigError = /^Missing STRIPE_/i.test(message);
    res.status(isConfigError ? 503 : 500).json({
      message,
      code: isConfigError ? "stripe_not_configured" : "stripe_checkout_failed",
    });
  }
}
