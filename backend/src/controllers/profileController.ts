import { Response } from "express";
import { z } from "zod";
import {
  getUserById,
  listProducts,
  listReels,
  toggleFollow,
  updateUser,
} from "../data/mockDb";
import { AuthenticatedRequest } from "../middleware/auth";
import { isSupportedImageSource, rejectIfSexualContent, rejectIfSexualMedia } from "./contentSafety";
import { withUserCounts } from "./helpers";

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  username: z.string().min(3).optional(),
  bio: z.string().min(2).optional(),
  headline: z.string().min(2).optional(),
  profileImage: z.string().refine((value) => isSupportedImageSource(value), "Invalid profile image").optional(),
});

export function getMyProfile(req: AuthenticatedRequest, res: Response) {
  const user = req.user ? getUserById(req.user.id) : undefined;
  if (!user) {
    res.status(404).json({ message: "User not found." });
    return;
  }

  const reels = listReels().filter((item) => item.userId === user.id);
  const products = listProducts().filter((item) => item.userId === user.id);

  res.json({
    profile: {
      ...withUserCounts(user),
      reelsCount: reels.length,
      productsCount: products.length,
      reels,
      products,
    },
  });
}

export async function updateMyProfile(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(parsed.error.flatten());
    return;
  }

  if (rejectIfSexualContent(res, [parsed.data.bio, parsed.data.headline, parsed.data.profileImage])) {
    return;
  }

  if (
    await rejectIfSexualMedia(res, [
      parsed.data.profileImage ? { type: "image", url: parsed.data.profileImage, label: "profile image" } : undefined,
    ])
  ) {
    return;
  }

  const updatedUser = updateUser(userId, parsed.data);
  if (!updatedUser) {
    res.status(404).json({ message: "User not found." });
    return;
  }

  res.json({
    profile: withUserCounts(updatedUser),
  });
}

export function getPublicProfile(req: AuthenticatedRequest, res: Response) {
  const user = getUserById(req.params.id);
  if (!user) {
    res.status(404).json({ message: "User not found." });
    return;
  }

  const reels = listReels().filter((item) => item.userId === user.id);
  const products = listProducts().filter((item) => item.userId === user.id);

  res.json({
    profile: {
      ...withUserCounts(user),
      reelsCount: reels.length,
      productsCount: products.length,
      reels,
      products,
    },
  });
}

export function toggleFollowUser(req: AuthenticatedRequest, res: Response) {
  const currentUserId = req.user?.id;
  const targetUser = getUserById(req.params.id);

  if (!currentUserId) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  if (!targetUser) {
    res.status(404).json({ message: "Target user not found." });
    return;
  }

  if (currentUserId === targetUser.id) {
    res.status(400).json({ message: "You cannot follow yourself." });
    return;
  }

  res.json({
    result: toggleFollow(currentUserId, targetUser.id),
    targetUser: withUserCounts(targetUser),
  });
}
