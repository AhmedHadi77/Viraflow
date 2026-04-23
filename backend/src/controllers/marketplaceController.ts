import { Response } from "express";
import { z } from "zod";
import {
  addMarketplaceMessage,
  createMarketplaceOrder,
  createOrGetMarketplaceThread,
  getMarketplaceThreadById,
  listMarketplaceMessagesByThread,
  listMarketplaceOrdersByUser,
  listMarketplaceThreadsByUser,
} from "../data/mockDb";
import { AuthenticatedRequest } from "../middleware/auth";
import { emitMarketplaceMessageRealtime } from "../realtime/socketServer";
import {
  buildMarketplaceMessagePayload,
  buildMarketplaceOrderPayload,
  buildMarketplaceThreadPayload,
} from "./helpers";
import { rejectIfSexualContent } from "./contentSafety";

const createThreadSchema = z.object({
  productId: z.string().min(2),
});

const createMessageSchema = z.object({
  text: z.string().min(1).max(500),
});

const createOrderSchema = z.object({
  productId: z.string().min(2),
  deliveryMethod: z.enum(["pickup", "shipping"]),
  paymentMethod: z.enum(["card", "cash"]),
  shippingAddress: z.string().max(200).optional(),
  buyerNote: z.string().max(200).optional(),
});

export function getMarketplaceInbox(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  res.json({
    threads: listMarketplaceThreadsByUser(userId).map(buildMarketplaceThreadPayload),
    messages: listMarketplaceThreadsByUser(userId)
      .flatMap((thread) => listMarketplaceMessagesByThread(thread.id))
      .map(buildMarketplaceMessagePayload),
    orders: listMarketplaceOrdersByUser(userId).map(buildMarketplaceOrderPayload),
  });
}

export function postMarketplaceThread(req: AuthenticatedRequest, res: Response) {
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

  const thread = createOrGetMarketplaceThread(userId, parsed.data.productId);
  if (!thread) {
    res.status(400).json({ message: "This chat could not be created for the selected product." });
    return;
  }

  res.status(201).json({
    thread: buildMarketplaceThreadPayload(thread),
    messages: listMarketplaceMessagesByThread(thread.id).map(buildMarketplaceMessagePayload),
  });
}

export function getMarketplaceThread(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  const thread = getMarketplaceThreadById(req.params.id);
  if (!thread || (thread.buyerId !== userId && thread.sellerId !== userId)) {
    res.status(404).json({ message: "Conversation not found." });
    return;
  }

  res.json({
    thread: buildMarketplaceThreadPayload(thread),
    messages: listMarketplaceMessagesByThread(thread.id).map(buildMarketplaceMessagePayload),
  });
}

export function postMarketplaceMessage(req: AuthenticatedRequest, res: Response) {
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

  const result = addMarketplaceMessage(userId, req.params.id, parsed.data.text);
  if (!result) {
    res.status(404).json({ message: "Conversation not found." });
    return;
  }

  emitMarketplaceMessageRealtime(result.thread, result.message);

  res.status(201).json({
    thread: buildMarketplaceThreadPayload(result.thread),
    message: buildMarketplaceMessagePayload(result.message),
  });
}

export function postMarketplaceOrder(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(parsed.error.flatten());
    return;
  }

  if (parsed.data.deliveryMethod === "shipping" && !parsed.data.shippingAddress?.trim()) {
    res.status(400).json({ message: "Shipping address is required for shipping orders." });
    return;
  }

  if (rejectIfSexualContent(res, [parsed.data.buyerNote])) {
    return;
  }

  const result = createMarketplaceOrder(userId, parsed.data);
  if (!result) {
    res.status(400).json({ message: "This order could not be placed for the selected listing." });
    return;
  }

  if (result.orderMessage) {
    emitMarketplaceMessageRealtime(result.thread, result.orderMessage);
  }

  res.status(201).json({
    order: buildMarketplaceOrderPayload(result.order),
    thread: buildMarketplaceThreadPayload(result.thread),
    product: result.product ? result.product : null,
  });
}
