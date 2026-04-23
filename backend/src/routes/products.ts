import { Router } from "express";
import { getProduct, getProducts, patchProductListingStatus, postProduct } from "../controllers/productController";
import { toggleSavedProduct } from "../controllers/savedController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", getProducts);
router.get("/:id", getProduct);
router.post("/", requireAuth, postProduct);
router.patch("/:id/status", requireAuth, patchProductListingStatus);
router.post("/:id/save", requireAuth, toggleSavedProduct);

export { router as productsRouter };
