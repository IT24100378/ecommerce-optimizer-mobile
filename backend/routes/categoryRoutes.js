// Category routes: admin and public endpoints for catalog categories.
const express = require('express');
const router = express.Router();
const { authenticateJwt, requireRole } = require('../middleware/auth');
const {
    getAllCategories,
    getAllCategoriesWithIds,
    createCategory,
    updateCategory,
    deleteCategory,
} = require('../services/categoryService');

// Normalizes error handling for category endpoints.
function handleRouteError(res, err, fallbackMessage) {
    if (err?.statusCode) {
        return res.status(err.statusCode).json({ error: err.message });
    }
    console.error('[categories] Route error:', err);
    return res.status(500).json({ error: fallbackMessage || 'Internal server error' });
}

router.get('/', async (req, res) => {
    try {
        const prisma = req.app.locals.prisma;
        const categories = await getAllCategories(prisma);
        return res.status(200).json(categories);
    } catch (err) {
        return handleRouteError(res, err, 'Failed to fetch categories.');
    }
});

router.get('/admin', authenticateJwt, requireRole('ADMIN', 'VENDOR'), async (req, res) => {
    try {
        const prisma = req.app.locals.prisma;
        const categories = await getAllCategoriesWithIds(prisma);
        return res.status(200).json(categories);
    } catch (err) {
        return handleRouteError(res, err, 'Failed to fetch categories.');
    }
});

router.post('/', authenticateJwt, requireRole('ADMIN', 'VENDOR'), async (req, res) => {
    try {
        const prisma = req.app.locals.prisma;
        const category = await createCategory(prisma, req.body?.name);
        return res.status(201).json({ message: 'Category created successfully.', category });
    } catch (err) {
        return handleRouteError(res, err, 'Failed to create category.');
    }
});

router.put('/:id', authenticateJwt, requireRole('ADMIN', 'VENDOR'), async (req, res) => {
    try {
        const prisma = req.app.locals.prisma;
        const updatedCategory = await updateCategory(prisma, req.params.id, req.body?.name);
        return res.status(200).json({ message: 'Category updated successfully.', category: updatedCategory });
    } catch (err) {
        return handleRouteError(res, err, 'Failed to update category.');
    }
});

router.delete('/:id', authenticateJwt, requireRole('ADMIN', 'VENDOR'), async (req, res) => {
    try {
        const prisma = req.app.locals.prisma;
        const result = await deleteCategory(prisma, req.params.id, {
            migrateToCategoryId: req.body?.migrateToCategoryId,
        });
        return res.status(200).json({
            message: 'Category deleted successfully.',
            ...result,
        });
    } catch (err) {
        return handleRouteError(res, err, 'Failed to delete category.');
    }
});

module.exports = router;

