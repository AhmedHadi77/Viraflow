import { Router } from "express";
import { exchangeRates, getLanguages, health, iceServers } from "../controllers/metaController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/health", health);
router.get("/languages", getLanguages);
router.get("/exchange-rates", exchangeRates);
router.get("/ice-servers", requireAuth, iceServers);

export { router as metaRouter };

