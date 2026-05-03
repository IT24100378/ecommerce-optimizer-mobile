const express = require('express');
const router = express.Router();
const { authenticateJwt, requireRole } = require('../middleware/auth');
const { ensureInventoryRecord, mapProductWithInventory } = require('../services/inventoryService');
const { normalizeCategoryName, ensureDefaultCategory } = require('../services/categoryService');
const { applyNativePromotionPricing } = require('../services/promotionService');
const {
    parseProductIdentifier,
    getNextProductCode,
    findProductByIdentifier,
} = require('../services/productCodeService');

function serverError(res, err, fallbackMessage) {
    console.error('[products] Route error:', err);
    return res.status(500).json({ error: fallbackMessage || 'Internal server error' });
}

function normalizeSku(value) {
    return String(value ?? '').trim();
}

async function resolveCategorySelection(prisma, category) {
    const normalizedCategory = normalizeCategoryName(category);
    if (!normalizedCategory) {
        const defaultCategory = await ensureDefaultCategory(prisma);
        return { ok: true, categoryId: defaultCategory.id, categoryName: defaultCategory.name };
    }

    const existingCategory = await prisma.category.findFirst({
        where: { name: { equals: normalizedCategory, mode: 'insensitive' } },
        select: { id: true, name: true },
    });
    if (!existingCategory) {
        return { ok: false, error: 'Please select a valid existing category.' };
    }

    return { ok: true, categoryId: existingCategory.id, categoryName: existingCategory.name };
}

function serializeProduct(product) {
    const mapped = mapProductWithInventory(product);
    const categoryName = product?.categoryRef?.name || '';
    const effectivePrice = Number(product?.effectivePrice ?? mapped.basePrice);
    return {
        ...mapped,
        categoryId: product?.categoryId ?? null,
        category: categoryName,
        effectivePrice,
        isOnPromotion: Boolean(product?.isOnPromotion),
        nativePromotionType: product?.nativePromotionType || null,
        nativePromotionDiscountPercentage: product?.nativePromotionDiscountPercentage ?? null,
        nativePromotionId: product?.nativePromotionId || null,
        nativePromotionName: product?.nativePromotionName || null,
        categoryRef: undefined,
    };
}

// productRoutes.js receives prisma via the app's locals
// so it can be reused and tested in isolation

// POST /api/products – Create a new product
router.post('/', authenticateJwt, requireRole('ADMIN', 'VENDOR'), async (req, res) => {
    try {
        const { name, description, sku, category, basePrice, imageUrl } = req.body;
        const prisma = req.app.locals.prisma;
        const normalizedSku = normalizeSku(sku);
        if (!normalizedSku) {
            return res.status(400).json({ error: 'SKU is required.' });
        }

        const categoryCheck = await resolveCategorySelection(prisma, category);
        if (!categoryCheck.ok) {
            return res.status(400).json({ error: categoryCheck.error });
        }
        const parsedBasePrice = Number.parseFloat(basePrice);
        if (Number.isNaN(parsedBasePrice) || parsedBasePrice < 0) {
            return res.status(400).json({ error: 'basePrice is required and must be a non-negative number.' });
        }
        const existingSku = await prisma.product.findFirst({
            where: { sku: normalizedSku },
            select: { id: true },
        });
        if (existingSku) {
            return res.status(409).json({ error: `SKU '${normalizedSku}' already exists.` });
        }

        const newProduct = await prisma.$transaction(async (tx) => {
            const productCode = await getNextProductCode(tx);
            const createdProduct = await tx.product.create({
                data: {
                    productCode,
                    name,
                    description,
                    sku: normalizedSku,
                    categoryId: categoryCheck.categoryId,
                    basePrice: parsedBasePrice,
                    imageUrl,
                    // Stock is controlled by Inventory; default product stock to 0 for compatibility.
                    stockQuantity: 0,
                },
            });
            await ensureInventoryRecord(tx, createdProduct.id);
            return tx.product.findUnique({
                where: { id: createdProduct.id },
                include: { inventory: true, categoryRef: true },
            });
        });

        const [pricedProduct] = await applyNativePromotionPricing(prisma, [newProduct]);
        res.status(201).json({ message: 'Product created successfully!', product: serializeProduct(pricedProduct) });
    } catch (error) {
        if (error?.code === 'P2002') {
            return res.status(409).json({ error: 'SKU already exists.' });
        }
        return serverError(res, error, 'Failed to create product. SKU might already exist.');
    }
});

// GET /api/products/:id – Read a single active product
router.get('/:id', async (req, res) => {
    try {
        const parsedIdentifier = parseProductIdentifier(req.params.id);
        if (parsedIdentifier.kind === 'invalid') {
            return res.status(400).json({ error: 'Invalid product ID. Use Mongo ObjectId or numeric product code.' });
        }
        const prisma = req.app.locals.prisma;

        const product = await findProductByIdentifier(prisma, req.params.id, {
            where: { isActive: true },
            include: { inventory: true, categoryRef: true },
        });

        if (!product) return res.status(404).json({ error: 'Product not found.' });
        const [pricedProduct] = await applyNativePromotionPricing(prisma, [product]);
        res.status(200).json(serializeProduct(pricedProduct));
    } catch (error) {
        return serverError(res, error, 'Failed to fetch product.');
    }
});

// GET /api/products – Read all active products (isActive = true)
router.get('/', async (req, res) => {
    try {
        const prisma = req.app.locals.prisma;

        const products = await prisma.product.findMany({
            where: { isActive: true },
            include: { inventory: true, categoryRef: true },
            orderBy: { createdAt: 'desc' },
        });

        const pricedProducts = await applyNativePromotionPricing(prisma, products);
        res.status(200).json(pricedProducts.map(serializeProduct));
    } catch (error) {
        return serverError(res, error, 'Failed to fetch products.');
    }
});

// PUT /api/products/:id – Update an existing product
router.put('/:id', authenticateJwt, requireRole('ADMIN', 'VENDOR'), async (req, res) => {
    try {
        const parsedIdentifier = parseProductIdentifier(req.params.id);
        if (parsedIdentifier.kind === 'invalid') {
            return res.status(400).json({ error: 'Invalid product ID. Use Mongo ObjectId or numeric product code.' });
        }
        const { name, description, sku, category, basePrice, imageUrl } = req.body;
        const normalizedSku = sku === undefined ? undefined : normalizeSku(sku);
        if (sku !== undefined && !normalizedSku) {
            return res.status(400).json({ error: 'SKU cannot be empty.' });
        }
        const prisma = req.app.locals.prisma;
        const existingProduct = await findProductByIdentifier(prisma, req.params.id, { select: { id: true } });
        if (!existingProduct) {
            return res.status(404).json({ error: 'Product not found.' });
        }
        if (normalizedSku !== undefined) {
            const existingSku = await prisma.product.findFirst({
                where: {
                    sku: normalizedSku,
                    id: { not: existingProduct.id },
                },
                select: { id: true },
            });
            if (existingSku) {
                return res.status(409).json({ error: `SKU '${normalizedSku}' already exists.` });
            }
        }
        const data = { name, description, sku: normalizedSku, basePrice, imageUrl };
        if (category !== undefined) {
            const categoryCheck = await resolveCategorySelection(prisma, category);
            if (!categoryCheck.ok) {
                return res.status(400).json({ error: categoryCheck.error });
            }
            data.categoryId = categoryCheck.categoryId;
        }
        if (basePrice !== undefined) {
            const parsedBasePrice = Number.parseFloat(basePrice);
            if (Number.isNaN(parsedBasePrice) || parsedBasePrice < 0) {
                return res.status(400).json({ error: 'basePrice must be a non-negative number.' });
            }
            data.basePrice = parsedBasePrice;
        }

        const updatedProduct = await prisma.$transaction(async (tx) => {
            const updated = await tx.product.update({
                where: { id: existingProduct.id },
                data,
                include: { inventory: true, categoryRef: true },
            });
            if (!updated.inventory) {
                await ensureInventoryRecord(tx, updated.id);
            }
            return tx.product.findUnique({ where: { id: updated.id }, include: { inventory: true, categoryRef: true } });
        });

        const [pricedProduct] = await applyNativePromotionPricing(prisma, [updatedProduct]);
        res.status(200).json({ message: 'Product updated successfully!', product: serializeProduct(pricedProduct) });
    } catch (error) {
        if (error?.code === 'P2002') {
            return res.status(409).json({ error: 'SKU already exists.' });
        }
        return serverError(res, error, 'Failed to update product.');
    }
});

// DELETE /api/products/:id – Soft delete (set isActive = false)
router.delete('/:id', authenticateJwt, requireRole('ADMIN', 'VENDOR'), async (req, res) => {
    try {
        const parsedIdentifier = parseProductIdentifier(req.params.id);
        if (parsedIdentifier.kind === 'invalid') {
            return res.status(400).json({ error: 'Invalid product ID. Use Mongo ObjectId or numeric product code.' });
        }
        const prisma = req.app.locals.prisma;
        const existingProduct = await findProductByIdentifier(prisma, req.params.id, { select: { id: true } });
        if (!existingProduct) {
            return res.status(404).json({ error: 'Product not found.' });
        }

        await prisma.product.update({
            where: { id: existingProduct.id },
            data: { isActive: false },
        });

        res.status(200).json({ message: 'Product deleted successfully.' });
    } catch (error) {
        return serverError(res, error, 'Failed to delete product.');
    }
});

module.exports = router;
