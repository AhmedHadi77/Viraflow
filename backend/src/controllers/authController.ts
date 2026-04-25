import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { getFirebaseUserProfileById } from "../services/firebaseService";

export function register(req: Request, res: Response) {
  res.status(410).json({
    message:
      "Pulseora now uses Firebase Auth on the client. Create accounts in the app with Firebase, then send the Firebase ID token to the API.",
  });
}

export function login(req: Request, res: Response) {
  res.status(410).json({
    message:
      "Pulseora now uses Firebase Auth on the client. Sign in with Firebase in the app, then use that Firebase ID token for API requests.",
  });
}

export async function me(req: AuthenticatedRequest, res: Response) {
  if (!req.user?.id) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  const profile = await getFirebaseUserProfileById(req.user.id);
  if (profile) {
    res.json({
      user: profile,
    });
    return;
  }

  res.json({
    user: {
      id: req.user.id,
      name: req.user.name ?? "Pulseora Creator",
      username: req.user.email?.split("@")[0] ?? req.user.id.slice(0, 12).toLowerCase(),
      email: req.user.email ?? "",
      profileImage: req.user.picture ?? "",
      bio: "",
      headline: "",
      language: "en",
      createdAt: new Date().toISOString(),
    },
  });
}
