import { Router } from "express";
import { createCheckoutSession, getMySubscription, getPlans } from "../controllers/subscriptionController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/plans", getPlans);
router.get("/me", requireAuth, getMySubscription);
router.post("/checkout-session", requireAuth, createCheckoutSession);

export { router as subscriptionsRouter };
