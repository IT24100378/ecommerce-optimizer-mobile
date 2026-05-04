// Product code service: parsing and sequencing for product identifiers.
const PRODUCT_CODE_COUNTER_KEY = 'product_code';

// Parses a numeric product code from input.
function parseProductCode(value) {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

// Validates Mongo ObjectId strings.
function isValidObjectId(value) {
    return typeof value === 'string' && /^[a-fA-F0-9]{24}$/.test(value);
}

// Parses an identifier string into ObjectId or product code form.
function parseProductIdentifier(value) {
    const asString = String(value ?? '').trim();
    if (!asString) return { kind: 'invalid' };
    if (isValidObjectId(asString)) return { kind: 'objectId', value: asString };
    const code = parseProductCode(asString);
    if (code !== null) return { kind: 'productCode', value: code };
    return { kind: 'invalid' };
}

// Increments and returns the next product code sequence.
async function getNextProductCode(prisma) {
    const counter = await prisma.counter.upsert({
        where: { key: PRODUCT_CODE_COUNTER_KEY },
        create: { key: PRODUCT_CODE_COUNTER_KEY, seq: 1 },
        update: { seq: { increment: 1 } },
        select: { seq: true },
    });
    return counter.seq;
}

// Finds a product by ObjectId or numeric product code.
async function findProductByIdentifier(prisma, rawIdentifier, extraQuery = {}) {
    const parsed = parseProductIdentifier(rawIdentifier);
    if (parsed.kind === 'invalid') return null;

    if (parsed.kind === 'objectId') {
        return prisma.product.findFirst({
            where: { id: parsed.value, ...(extraQuery.where || {}) },
            ...extraQuery,
        });
    }

    return prisma.product.findFirst({
        where: { productCode: parsed.value, ...(extraQuery.where || {}) },
        ...extraQuery,
    });
}

// Backfills missing product codes in batches.
async function backfillMissingProductCodes(prisma) {
    const missingCount = await prisma.product.count({
        where: { productCode: null },
    });
    if (missingCount === 0) return;

    const maxCodeRow = await prisma.product.findFirst({
        where: { productCode: { not: null } },
        orderBy: { productCode: 'desc' },
        select: { productCode: true },
    });
    let nextCode = Number(maxCodeRow?.productCode || 0);
    const batchSize = 100;
    let processed = 0;

    while (processed < missingCount) {
        // eslint-disable-next-line no-await-in-loop
        const batch = await prisma.product.findMany({
            where: { productCode: null },
            orderBy: { createdAt: 'asc' },
            take: batchSize,
            select: { id: true },
        });
        if (batch.length === 0) break;

        // eslint-disable-next-line no-await-in-loop
        await prisma.$transaction(async (tx) => {
            for (const product of batch) {
                // eslint-disable-next-line no-await-in-loop
                await tx.product.update({
                    where: { id: product.id },
                    data: { productCode: ++nextCode },
                });
            }
            await tx.counter.upsert({
                where: { key: PRODUCT_CODE_COUNTER_KEY },
                create: { key: PRODUCT_CODE_COUNTER_KEY, seq: nextCode },
                update: { seq: { set: nextCode } },
            });
        });

        processed += batch.length;
    }
}

module.exports = {
    parseProductIdentifier,
    getNextProductCode,
    findProductByIdentifier,
    backfillMissingProductCodes,
};
