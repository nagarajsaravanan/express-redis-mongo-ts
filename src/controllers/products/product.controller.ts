import type { Request, Response } from "express";
import mongoose from "mongoose";
import Product, { type IProduct } from "../../models/product.model";
import redisClient from "../../config/redis.config";

const ALL_PRODUCTS_CACHE_KEY = "products:all";
const getProductCacheKey = (id: string): string => `product:${id}`;
const CACHE_TTL_SECONDS = 300; // 5 minutes

const extractParamId = (param: string | string[] | undefined): string | null => {
    const id = Array.isArray(param) ? param[0] : param;
    return id && mongoose.Types.ObjectId.isValid(id) ? id : null;
};

/**
 * Create a new product
 * POST /api/products
 */
export const createProduct = async (req: Request, res: Response): Promise<void> => {
    try {
        const payload: IProduct = req.body;
        const product = await Product.create(payload);

        // Invalidate list cache and warm individual cache
        if (redisClient.isReady) {
            await Promise.all([
                redisClient.del(ALL_PRODUCTS_CACHE_KEY),
                redisClient.set(
                    getProductCacheKey(product._id.toString()),
                    JSON.stringify(product),
                    { EX: CACHE_TTL_SECONDS }
                ),
            ]);
        }

        res.status(201).json({
            success: true,
            message: "Product created successfully",
            data: product,
        });
    } catch (error) {
        if (error instanceof mongoose.Error.ValidationError) {
            res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: Object.values(error.errors).map((err) => err.message),
            });
            return;
        }

        console.error("Error creating product:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create product",
        });
    }
};

/**
 * Get all products (with Redis caching)
 * GET /api/products
 */
export const getAllProducts = async (_req: Request, res: Response): Promise<void> => {
    try {
        // 1. Check Redis cache first
        if (redisClient.isReady) {
            const cachedProducts = await redisClient.get(ALL_PRODUCTS_CACHE_KEY);
            if (cachedProducts) {
                const parsed = JSON.parse(cachedProducts);
                res.status(200).json({
                    success: true,
                    source: "redis-cache",
                    count: parsed.length,
                    data: parsed,
                });
                return;
            }
        }

        // 2. Cache miss: fetch from MongoDB
        const products = await Product.find().sort({ createdAt: -1 }).lean();

        // 3. Store result in Redis cache
        if (redisClient.isReady) {
            await redisClient.set(ALL_PRODUCTS_CACHE_KEY, JSON.stringify(products), {
                EX: CACHE_TTL_SECONDS,
            });
        }

        res.status(200).json({
            success: true,
            source: "mongodb",
            count: products.length,
            data: products,
        });
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch products",
        });
    }
};

/**
 * Get a single product by ID (with Redis caching)
 * GET /api/products/:id
 */
export const getProductById = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = extractParamId(req.params.id);
        if (!id) {
            res.status(400).json({
                success: false,
                message: "Invalid product ID",
            });
            return;
        }

        const cacheKey = getProductCacheKey(id);

        // 1. Check Redis cache first
        if (redisClient.isReady) {
            const cachedProduct = await redisClient.get(cacheKey);
            if (cachedProduct) {
                res.status(200).json({
                    success: true,
                    source: "redis-cache",
                    data: JSON.parse(cachedProduct),
                });
                return;
            }
        }

        // 2. Cache miss: fetch from MongoDB
        const product = await Product.findById(id).lean();
        if (!product) {
            res.status(404).json({
                success: false,
                message: "Product not found",
            });
            return;
        }

        // 3. Store result in Redis cache
        if (redisClient.isReady) {
            await redisClient.set(cacheKey, JSON.stringify(product), {
                EX: CACHE_TTL_SECONDS,
            });
        }

        res.status(200).json({
            success: true,
            source: "mongodb",
            data: product,
        });
    } catch (error) {
        console.error("Error fetching product by ID:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch product",
        });
    }
};

/**
 * Update a product by ID
 * PUT /api/products/:id | PATCH /api/products/:id
 */
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = extractParamId(req.params.id);
        if (!id) {
            res.status(400).json({
                success: false,
                message: "Invalid product ID",
            });
            return;
        }

        const updates: Partial<IProduct> = req.body;
        const updatedProduct = await Product.findByIdAndUpdate(id, updates, {
            returnDocument: "after",
            runValidators: true,
        }).lean();

        if (!updatedProduct) {
            res.status(404).json({
                success: false,
                message: "Product not found",
            });
            return;
        }

        // Invalidate list cache and refresh item cache
        if (redisClient.isReady) {
            await Promise.all([
                redisClient.del(ALL_PRODUCTS_CACHE_KEY),
                redisClient.set(getProductCacheKey(id), JSON.stringify(updatedProduct), {
                    EX: CACHE_TTL_SECONDS,
                }),
            ]);
        }

        res.status(200).json({
            success: true,
            message: "Product updated successfully",
            data: updatedProduct,
        });
    } catch (error) {
        if (error instanceof mongoose.Error.ValidationError) {
            res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: Object.values(error.errors).map((err) => err.message),
            });
            return;
        }

        console.error("Error updating product:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update product",
        });
    }
};

/**
 * Delete a product by ID
 * DELETE /api/products/:id
 */
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = extractParamId(req.params.id);
        if (!id) {
            res.status(400).json({
                success: false,
                message: "Invalid product ID",
            });
            return;
        }

        const deletedProduct = await Product.findByIdAndDelete(id).lean();
        if (!deletedProduct) {
            res.status(404).json({
                success: false,
                message: "Product not found",
            });
            return;
        }

        // Invalidate both list and item caches
        if (redisClient.isReady) {
            await redisClient.del([ALL_PRODUCTS_CACHE_KEY, getProductCacheKey(id)]);
        }

        res.status(200).json({
            success: true,
            message: "Product deleted successfully",
            data: deletedProduct,
        });
    } catch (error) {
        console.error("Error deleting product:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete product",
        });
    }
};

