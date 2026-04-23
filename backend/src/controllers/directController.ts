import { Response } from "express";
import { z } from "zod";
import {
  addDirectMessage,
  canUsersDirectMessage,
  createOrGetDirectThread,
  getDirectThreadById,
  getUserById,
  listDirectMessagesByThread,
  listDirectThreadsByUser,
} from "../data/mockDb";
import { AuthenticatedRequest } from "../middleware/auth";
import { emitDirectMessageRealtime } from "../realtime/socketServer";
import { buildDirectMessagePayload, buildDirectThreadPayload } from "./helpers";
import { rejectIfSexualContent } from "./contentSafety";

const createThreadSchema = z.object({
  targetUserId: z.string().min(2),
});

const createMessageSchema = z.object({
  text: z.string().min(1).max(500),
});

export function getDirectInbox(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  res.json({
    threads: listDirectThreadsByUser(userId).map(buildDirectThreadPayload),
    messages: listDirectThreadsByUser(userId)
      .flatMap((thread) => listDirectMessagesByThread(thread.id))
      .map(buildDirectMessagePayload),
  });
}

export function postDirectThread(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  const parsed = createThreadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(parsed.error.flatten());
    return;
  }

  const targetUser = getUserById(parsed.data.targetUserId);
  if (!targetUser) {
    res.status(404).json({ message: "Creator not found." });
    return;
  }

  if (!canUsersDirectMessage(userId, targetUser.id)) {
    res.status(403).json({ message: "Direct chat unlocks only after both of you follow each other." });
    return;
  }

  const thread = createOrGetDirectThread(userId, targetUser.id);
  if (!thread) {
    res.status(400).json({ message: "This direct conversation could not be created." });
    return;
  }

  res.status(201).json({
    thread: buildDirectThreadPayload(thread),
    messages: listDirectMessagesByThread(thread.id).map(buildDirectMessagePayload),
  });
}

export function getDirectThread(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  const thread = getDirectThreadById(req.params.id);
  if (!thread || !thread.participantIds.includes(userId)) {
    res.status(404).json({ message: "Conversation not found." });
    return;
  }

  const counterpartId = thread.participantIds.find((participantId) => participantId !== userId);
  if (!counterpartId || !canUsersDirectMessage(userId, counterpartId)) {
    res.status(403).json({ message: "Direct chat is locked until both users follow each other." });
    return;
  }

  res.json({
    thread: buildDirectThreadPayload(thread),
    messages: listDirectMessagesByThread(thread.id).map(buildDirectMessagePayload),
  });
}

export function postDirectMessage(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  const parsed = createMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(parsed.error.flatten());
    return;
  }

  if (rejectIfSexualContent(res, [parsed.data.text])) {
    return;
  }

  const thread = getDirectThreadById(req.params.id);
  if (!thread || !thread.participantIds.includes(userId)) {
    res.status(404).json({ message: "Conversation not found." });
    return;
  }

  const counterpartId = thread.participantIds.find((participantId) => participantId !== userId);
  if (!counterpartId || !canUsersDirectMessage(userId, counterpartId)) {
    res.status(403).json({ message: "Direct chat is locked until both users follow each other." });
    return;
  }

  const result = addDirectMessage(userId, req.params.id, parsed.data.text);
  if (!result) {
    res.status(400).json({ message: "This message could not be sent." });
    return;
  }

  emitDirectMessageRealtime(result.thread, result.message);

  res.status(201).json({
    thread: buildDirectThreadPayload(result.thread),
    message: buildDirectMessagePayload(result.message),
  });
}
