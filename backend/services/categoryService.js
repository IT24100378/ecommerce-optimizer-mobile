function normalizeCategoryName(value) {
    return String(value || '').trim().replace(/\s+/g, ' ');
}

const DEFAULT_CATEGORY_NAME = 'Uncategorized';

function isValidObjectId(value) {
    return typeof value === 'string' && /^[a-fA-F0-9]{24}$/.test(value);
}

function badRequest(message) {
    const err = new Error(message);
    err.statusCode = 400;
    return err;
}

function conflict(message, details) {
    const err = new Error(message);
    err.statusCode = 409;
    if (details) {
        err.details = details;
    }
    return err;
}

async function getAllCategories(prisma) {
    const categories = await prisma.category.findMany({
        select: { name: true },
        orderBy: { name: 'asc' },
    });
    return categories.map((item) => item.name);
}

async function ensureDefaultCategory(prisma, tx = prisma) {
    const existing = await tx.category.findFirst({
        where: { name: { equals: DEFAULT_CATEGORY_NAME, mode: 'insensitive' } },
        select: { id: true, name: true },
    });
    if (existing) {
        return existing;
    }
    return tx.category.create({
        data: { name: DEFAULT_CATEGORY_NAME },
        select: { id: true, name: true },
    });
}

async function createCategory(prisma, rawName) {
    const name = normalizeCategoryName(rawName);
    if (!name) {
        throw badRequest('Category name is required.');
    }

    const existing = await prisma.category.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
        select: { id: true },
    });
    if (existing) {
        throw conflict('Category already exists.');
    }

    await prisma.category.create({ data: { name } });

    return name;
}

async function getAllCategoriesWithIds(prisma) {
    return prisma.category.findMany({
        select: { id: true, name: true, createdAt: true },
        orderBy: { name: 'asc' },
    });
}

async function updateCategory(prisma, categoryId, rawName) {
    if (!isValidObjectId(categoryId)) {
        throw badRequest('Invalid category id.');
    }

    const name = normalizeCategoryName(rawName);
    if (!name) {
        throw badRequest('Category name is required.');
    }

    const existing = await prisma.category.findUnique({
        where: { id: categoryId },
        select: { id: true, name: true },
    });
    if (!existing) {
        const err = new Error('Category not found.');
        err.statusCode = 404;
        throw err;
    }

    const duplicate = await prisma.category.findFirst({
        where: {
            id: { not: categoryId },
            name: { equals: name, mode: 'insensitive' },
        },
        select: { id: true },
    });
    if (duplicate) {
        throw conflict('Category already exists.');
    }

    return prisma.category.update({
        where: { id: categoryId },
        data: { name },
        select: { id: true, name: true, createdAt: true },
    });
}

async function deleteCategory(prisma, categoryId, options = {}) {
    if (!isValidObjectId(categoryId)) {
        throw badRequest('Invalid category id.');
    }

    const migrateToCategoryId = options.migrateToCategoryId ? String(options.migrateToCategoryId) : null;
    if (migrateToCategoryId && !isValidObjectId(migrateToCategoryId)) {
        throw badRequest('migrateToCategoryId must be a valid category id.');
    }
    if (migrateToCategoryId && migrateToCategoryId === categoryId) {
        throw badRequest('migrateToCategoryId must be different from category id.');
    }

    const existing = await prisma.category.findUnique({
        where: { id: categoryId },
        select: { id: true, name: true },
    });
    if (!existing) {
        const err = new Error('Category not found.');
        err.statusCode = 404;
        throw err;
    }

    if (existing.name.toLowerCase() === DEFAULT_CATEGORY_NAME.toLowerCase()) {
        throw badRequest('The default Uncategorized category cannot be deleted.');
    }

    if (migrateToCategoryId) {
        const target = await prisma.category.findUnique({
            where: { id: migrateToCategoryId },
            select: { id: true, name: true },
        });
        if (!target) {
            const err = new Error('Target migration category not found.');
            err.statusCode = 404;
            throw err;
        }

        const result = await prisma.$transaction(async (tx) => {
            const movedProducts = await tx.product.updateMany({
                where: { categoryId },
                data: { categoryId: migrateToCategoryId },
            });
            const movedPromotions = await tx.promotion.updateMany({
                where: { categoryId },
                data: { categoryId: migrateToCategoryId },
            });
            await tx.category.delete({ where: { id: categoryId } });
            return {
                deletedCategoryId: categoryId,
                migratedToCategoryId: migrateToCategoryId,
                migratedProducts: movedProducts.count,
                migratedPromotions: movedPromotions.count,
            };
        });

        return result;
    }

    const result = await prisma.$transaction(async (tx) => {
        const defaultCategory = await ensureDefaultCategory(prisma, tx);
        if (defaultCategory.id === categoryId) {
            throw badRequest('The default Uncategorized category cannot be deleted.');
        }
        const movedProducts = await tx.product.updateMany({
            where: { categoryId },
            data: { categoryId: defaultCategory.id },
        });
        await tx.category.delete({ where: { id: categoryId } });
        return {
            deletedCategoryId: categoryId,
            migratedToCategoryId: defaultCategory.id,
            migratedProducts: movedProducts.count,
            migratedPromotions: 0,
        };
    });

    return result;
}

module.exports = {
    getAllCategories,
    getAllCategoriesWithIds,
    createCategory,
    updateCategory,
    deleteCategory,
    normalizeCategoryName,
    ensureDefaultCategory,
    DEFAULT_CATEGORY_NAME,
};

