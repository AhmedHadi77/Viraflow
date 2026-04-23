import { Request, Response } from "express";
import { z } from "zod";
import { createProduct, getProductById, listProducts, updateProductListingStatus } from "../data/mockDb";
import { AuthenticatedRequest } from "../middleware/auth";
import { isSupportedImageSource, rejectIfSexualContent, rejectIfSexualMedia } from "./contentSafety";
import { buildProductPayload } from "./helpers";

const createProductSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(5),
  price: z.number().nonnegative(),
  imageUrls: z.array(z.string().refine((value) => isSupportedImageSource(value), "Invalid image")).min(1).max(6),
  category: z.string().min(2),
  condition: z.enum(["New", "Like New", "Good", "Fair"]),
  location: z.string().min(2),
});

const updateProductStatusSchema = z.object({
  listingStatus: z.enum(["available", "pending", "sold"]),
});

export function getProducts(_req: Request, res: Response) {
  res.json({
    products: listProducts().map(buildProductPayload),
  });
}

export function getProduct(req: Request, res: Response) {
  const product = getProductById(req.params.id);
  if (!product) {
    res.status(404).json({ message: "Product not found." });
    return;
  }

  res.json({
    product: buildProductPayload(product),
  });
}

export async function postProduct(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  const parsed = createProductSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(parsed.error.flatten());
    return;
  }

  if (rejectIfSexualContent(res, [parsed.data.title, parsed.data.description, parsed.data.category, parsed.data.location])) {
    return;
  }

  if (
    await rejectIfSexualMedia(res, [
      ...parsed.data.imageUrls.map((imageUrl, index) => ({ type: "image" as const, url: imageUrl, label: `product image ${index + 1}` })),
    ])
  ) {
    return;
  }

  const product = createProduct(userId, parsed.data);
  res.status(201).json({
    product: buildProductPayload(product),
  });
}

export function patchProductListingStatus(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  const parsed = updateProductStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(parsed.error.flatten());
    return;
  }

  const existingProduct = getProductById(req.params.id);
  if (!existingProduct) {
    res.status(404).json({ message: "Product not found." });
    return;
  }

  if (existingProduct.userId !== userId) {
    res.status(403).json({ message: "You can only manage your own listing." });
    return;
  }

  const product = updateProductListingStatus(userId, existingProduct.id, parsed.data.listingStatus);
  if (!product) {
    res.status(404).json({ message: "Product not found." });
    return;
  }

  res.json({
    product: buildProductPayload(product),
  });
}
