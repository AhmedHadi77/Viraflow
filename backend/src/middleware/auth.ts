import { NextFunction, Request, Response } from "express";
import { verifyFirebaseUserToken } from "../services/firebaseService";
import { verifySupabaseUserToken } from "../services/supabaseService";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    name?: string;
    picture?: string;
    provider?: "firebase" | "supabase";
    username?: string;
  };
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authorization = req.header("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Missing bearer token." });
    return;
  }

  const token = authorization.replace("Bearer ", "");
  const firebaseUser = await verifyFirebaseUserToken(token);
  const supabaseUser = firebaseUser ? undefined : await verifySupabaseUserToken(token);
  const user = firebaseUser ?? supabaseUser;
  if (!user) {
    res.status(401).json({ message: "Invalid token." });
    return;
  }

  req.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    picture: user.picture,
    provider: firebaseUser ? "firebase" : "supabase",
    username: supabaseUser?.username,
  };

  next();
}
