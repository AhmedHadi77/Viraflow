import { Router } from "express";
import { exchangeRates, getLanguages, health } from "../controllers/metaController";

const router = Router();

router.get("/health", health);
router.get("/languages", getLanguages);
router.get("/exchange-rates", exchangeRates);

export { router as metaRouter };

