import { NextFunction, Request, Response } from "express";
import { verifyFirebaseUserToken } from "../services/firebaseService";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    name?: string;
    picture?: string;
  };
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authorization = req.header("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Missing bearer token." });
    return;
  }

  const token = authorization.replace("Bearer ", "");
  const user = await verifyFirebaseUserToken(token);
  if (!user) {
    res.status(401).json({ message: "Invalid token." });
    return;
  }

  req.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    picture: user.picture,
  };

  next();
}
