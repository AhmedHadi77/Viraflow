import { Router } from "express";
import { getProduct, getProducts, patchProductListingStatus, postProduct, removeProduct } from "../controllers/productController";
import { toggleSavedProduct } from "../controllers/savedController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", getProducts);
router.get("/:id", getProduct);
router.post("/", requireAuth, postProduct);
router.patch("/:id/status", requireAuth, patchProductListingStatus);
router.post("/:id/save", requireAuth, toggleSavedProduct);
router.delete("/:id", requireAuth, removeProduct);

export { router as productsRouter };
