import { Response } from "express";
import { z } from "zod";
import {
  findUserByUsername,
  getUserById,
  listProducts,
  listReels,
  setUserBanStatus,
  toggleFollow,
  updateUser,
} from "../data/mockDb";
import { AuthenticatedRequest } from "../middleware/auth";
import { getOrCreateAuthenticatedUser } from "../services/authenticatedUserService";
import { isSupportedImageSource, rejectIfSexualContent, rejectIfSexualMedia } from "./contentSafety";
import { withUserCounts } from "./helpers";

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  username: z.string().min(3).optional(),
  bio: z.string().max(240).optional(),
  headline: z.string().max(80).optional(),
  website: z.string().optional(),
  profileImage: z.string().refine((value) => isSupportedImageSource(value), "Invalid profile image").optional(),
});

const banUserSchema = z.object({
  banned: z.boolean(),
});

export function getMyProfile(req: AuthenticatedRequest, res: Response) {
  const user = req.user ? getOrCreateAuthenticatedUser(req.user) : undefined;
  if (!user) {
    res.status(404).json({ message: "User not found." });
    return;
  }

  const reels = listReels().filter((item) => item.userId === user.id);
  const products = listProducts().filter((item) => item.userId === user.id);

  res.json({
    profile: {
      ...withUserCounts(user),
      postsCount: 0,
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
  getOrCreateAuthenticatedUser(req.user!);

  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(parsed.error.flatten());
    return;
  }

  if (rejectIfSexualContent(res, [parsed.data.bio, parsed.data.headline, parsed.data.website, parsed.data.profileImage])) {
    return;
  }

  if (parsed.data.username) {
    const normalizedUsername = normalizeUsername(parsed.data.username);
    const usernameMessage = getUsernameValidationMessage(normalizedUsername);
    if (usernameMessage) {
      res.status(400).json({ message: usernameMessage });
      return;
    }

    const existingUser = findUserByUsername(normalizedUsername);
    if (existingUser && existingUser.id !== userId) {
      res.status(409).json({ message: "That username is already taken." });
      return;
    }

    parsed.data.username = normalizedUsername;
  }

  if (parsed.data.website) {
    const normalizedWebsite = normalizeWebsite(parsed.data.website);
    const websiteMessage = getWebsiteValidationMessage(normalizedWebsite);
    if (websiteMessage) {
      res.status(400).json({ message: websiteMessage });
      return;
    }

    parsed.data.website = normalizedWebsite;
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

function normalizeUsername(username: string) {
  return username.trim().replace(/\s+/g, "").replace(/^@+/, "").toLowerCase();
}

function getUsernameValidationMessage(username: string) {
  if (!username) {
    return "Choose a username to continue.";
  }

  if (username.length < 3 || username.length > 20) {
    return "Username must be 3-20 characters long.";
  }

  if (!/^[a-z0-9._]+$/.test(username)) {
    return "Only letters, numbers, periods, and underscores are allowed.";
  }

  if (username.startsWith(".") || username.startsWith("_") || username.endsWith(".") || username.endsWith("_")) {
    return "Username cannot start or end with a period or underscore.";
  }

  if (username.includes("..") || username.includes("__") || username.includes("._") || username.includes("_.")) {
    return "Username cannot use repeated or mixed punctuation together.";
  }

  return null;
}

function normalizeWebsite(website: string) {
  const trimmed = website.trim();
  if (!trimmed) {
    return "";
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function getWebsiteValidationMessage(website: string) {
  if (!website.trim()) {
    return null;
  }

  try {
    const parsed = new URL(website);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "Website links must start with http or https.";
    }

    return null;
  } catch {
    return "Enter a valid website link.";
  }
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
      postsCount: 0,
      reelsCount: reels.length,
      productsCount: products.length,
      reels,
      products,
    },
  });
}

export function setUserBanStatusAdmin(req: AuthenticatedRequest, res: Response) {
  const actingUser = req.user ? getOrCreateAuthenticatedUser(req.user) : undefined;
  if (!actingUser) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  if (actingUser.role !== "admin") {
    res.status(403).json({ message: "Only admin users can update user status." });
    return;
  }

  const parsed = banUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(parsed.error.flatten());
    return;
  }

  if (actingUser.id === req.params.id && parsed.data.banned) {
    res.status(400).json({ message: "You cannot ban your own admin account." });
    return;
  }

  const updatedUser = setUserBanStatus(req.params.id, parsed.data.banned);
  if (!updatedUser) {
    res.status(404).json({ message: "User not found." });
    return;
  }

  res.json({
    profile: withUserCounts(updatedUser),
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
