import { purgeUserAccount } from "../services/adminService";
import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { getOrCreateAuthenticatedUser } from "../services/authenticatedUserService";
import { getFirebaseUserProfileById } from "../services/firebaseService";

export function register(req: Request, res: Response) {
  res.status(410).json({
    message:
      "Sohba now uses Firebase Auth on the client. Create accounts in the app with Firebase, then send the Firebase ID token to the API.",
  });
}

export function login(req: Request, res: Response) {
  res.status(410).json({
    message:
      "Sohba now uses Firebase Auth on the client. Sign in with Firebase in the app, then use that Firebase ID token for API requests.",
  });
}

export async function me(req: AuthenticatedRequest, res: Response) {
  if (!req.user?.id) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  const profile = req.user.provider === "firebase" ? await getFirebaseUserProfileById(req.user.id) : undefined;
  if (profile) {
    res.json({
      user: profile,
    });
    return;
  }

  res.json({
    user: getOrCreateAuthenticatedUser(req.user),
  });
}

/** Lets a signed-in person permanently delete their own account and everything in it. */
export async function deleteOwnAccount(req: AuthenticatedRequest, res: Response) {
  if (!req.user?.id || req.user.provider !== "firebase") {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }
  try {
    const removed = await purgeUserAccount(req.user.id);
    res.json({ ok: true, removed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The account could not be deleted. Try again.";
    res.status(500).json({ message });
  }
}
