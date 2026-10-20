import { Router } from "express";
import { deleteOwnAccount, login, me, register } from "../controllers/authController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", requireAuth, me);
router.delete("/account", requireAuth, deleteOwnAccount);

export { router as authRouter };

