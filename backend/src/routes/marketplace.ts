import { Router } from "express";
import {
  getMarketplaceInbox,
  getMarketplaceThread,
  postMarketplaceMessage,
  postMarketplaceOrder,
  postMarketplaceThread,
} from "../controllers/marketplaceController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/inbox/me", requireAuth, getMarketplaceInbox);
router.post("/chats", requireAuth, postMarketplaceThread);
router.get("/chats/:id", requireAuth, getMarketplaceThread);
router.post("/chats/:id/messages", requireAuth, postMarketplaceMessage);
router.post("/orders", requireAuth, postMarketplaceOrder);

export { router as marketplaceRouter };
