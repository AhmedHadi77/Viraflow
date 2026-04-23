import cors from "cors";
import express from "express";
import { handleStripeWebhook } from "./controllers/paymentController";
import { aiRouter } from "./routes/ai";
import { authRouter } from "./routes/auth";
import { communitiesRouter } from "./routes/communities";
import { directRouter } from "./routes/direct";
import { marketplaceRouter } from "./routes/marketplace";
import { mediaRouter } from "./routes/media";
import { metaRouter } from "./routes/meta";
import { notificationsRouter } from "./routes/notifications";
import { productsRouter } from "./routes/products";
import { profileRouter } from "./routes/profiles";
import { reelsRouter } from "./routes/reels";
import { savedRouter } from "./routes/saved";
import { storiesRouter } from "./routes/stories";
import { subscriptionsRouter } from "./routes/subscriptions";

export function createApp() {
  const app = express();

  app.use(cors());
  app.post("/api/payments/stripe/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);
  app.use(express.json({ limit: "15mb" }));

  app.use("/api/meta", metaRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/ai", aiRouter);
  app.use("/api/communities", communitiesRouter);
  app.use("/api/direct", directRouter);
  app.use("/api/marketplace", marketplaceRouter);
  app.use("/api/media", mediaRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/profiles", profileRouter);
  app.use("/api/reels", reelsRouter);
  app.use("/api/products", productsRouter);
  app.use("/api/saved", savedRouter);
  app.use("/api/stories", storiesRouter);
  app.use("/api/subscriptions", subscriptionsRouter);

  app.get("/", (_req, res) => {
    res.json({
      name: "ViraFlow API",
      version: "0.1.0",
      message: "Create. Go viral. Make money.",
    });
  });

  return app;
}
