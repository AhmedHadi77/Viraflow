import { Router } from "express";
import { getLanguages, health } from "../controllers/metaController";

const router = Router();

router.get("/health", health);
router.get("/languages", getLanguages);

export { router as metaRouter };

