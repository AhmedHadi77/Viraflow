import { Response } from "express";
import { getProductById, getReelById, listSavedPostsByUser, toggleSavedPost } from "../data/mockDb";
import { AuthenticatedRequest } from "../middleware/auth";
import { buildSavedPostPayload } from "./helpers";

export function getMySavedPosts(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  res.json({
    savedPosts: listSavedPostsByUser(userId).map(buildSavedPostPayload),
  });
}

export function toggleSavedReel(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  const reel = getReelById(req.params.id);
  if (!reel) {
    res.status(404).json({ message: "Reel not found." });
    return;
  }

  const result = toggleSavedPost(userId, "reel", reel.id);
  res.json({
    saved: result.saved,
    savedPost: result.savedPost ? buildSavedPostPayload(result.savedPost) : null,
  });
}

export function toggleSavedProduct(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  const product = getProductById(req.params.id);
  if (!product) {
    res.status(404).json({ message: "Product not found." });
    return;
  }

  const result = toggleSavedPost(userId, "product", product.id);
  res.json({
    saved: result.saved,
    savedPost: result.savedPost ? buildSavedPostPayload(result.savedPost) : null,
  });
}
