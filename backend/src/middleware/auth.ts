import { NextFunction, Request, Response } from "express";
import { getUserIdFromFirebaseToken } from "../services/firebaseService";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
  };
}

export function getUserIdFromAccessToken(token: string | undefined) {
  const prefix = "viraflow-token-";

  if (!token?.startsWith(prefix)) {
    return undefined;
  }

  return token.replace(prefix, "");
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authorization = req.header("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Missing bearer token." });
    return;
  }

  const token = authorization.replace("Bearer ", "");
  const userId = getUserIdFromAccessToken(token) ?? (await getUserIdFromFirebaseToken(token));
  if (!userId) {
    res.status(401).json({ message: "Invalid token." });
    return;
  }

  req.user = {
    id: userId,
  };

  next();
}
