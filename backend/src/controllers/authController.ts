import { Request, Response } from "express";
import { z } from "zod";
import { createUser, findUserByEmail, getUserById } from "../data/mockDb";
import { AuthenticatedRequest } from "../middleware/auth";
import { toPublicUser } from "./helpers";

const registerSchema = z.object({
  name: z.string().min(2),
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  language: z.enum(["en", "ar", "fr", "es"]).default("en"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json(parsed.error.flatten());
    return;
  }

  if (findUserByEmail(parsed.data.email)) {
    res.status(409).json({ message: "Email is already registered." });
    return;
  }

  const user = createUser(parsed.data);
  res.status(201).json({
    token: `viraflow-token-${user.id}`,
    user: toPublicUser(user),
  });
}

export function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json(parsed.error.flatten());
    return;
  }

  const user = findUserByEmail(parsed.data.email);
  if (!user || parsed.data.password.length < 1) {
    res.status(401).json({ message: "Invalid credentials." });
    return;
  }

  res.json({
    token: `viraflow-token-${user.id}`,
    user: toPublicUser(user),
  });
}

export function me(req: AuthenticatedRequest, res: Response) {
  const user = req.user ? getUserById(req.user.id) : undefined;
  if (!user) {
    res.status(404).json({ message: "User not found." });
    return;
  }

  res.json({
    user: toPublicUser(user),
  });
}

