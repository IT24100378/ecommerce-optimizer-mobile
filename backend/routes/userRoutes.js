// User routes: authentication, profile, and admin user management.
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateJwt, requireRole, isOwnerOrRole, getJwtSecret } = require('../middleware/auth');

// Validates Mongo ObjectId strings.
function isValidObjectId(value) {
    return typeof value === 'string' && /^[a-fA-F0-9]{24}$/.test(value);
}

// Parses a string into a valid ObjectId or returns null.
function parseId(value) {
    return isValidObjectId(value) ? value : null;
}

// Defines safe fields to return in user responses.
function safeUserSelect() {
    return {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        address: true,
        preferences: true,
        createdAt: true,
    };
}

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 64;

function validateEmailFormat(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizePhone(value) {
    if (value === null || value === undefined) return null;
    const trimmed = String(value).trim();
    if (!trimmed) return null;
    const normalized = trimmed.replace(/[^\d+]/g, '');
    const isValid = /^\+?[1-9]\d{7,14}$/.test(normalized);
    return isValid ? normalized : null;
}

function validatePasswordPolicy(password) {
    if (typeof password !== 'string') {
        return { valid: false, error: 'password must be a string' };
    }
    if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
        return { valid: false, error: `password must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters` };
    }
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
        return { valid: false, error: 'password must include upper, lower, and number characters' };
    }
    return { valid: true };
}

// Signs a JWT token for the authenticated user.
function signUserToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        getJwtSecret(),
        { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );
}

// Logs and formats unexpected user route errors.
function respondServerError(res, err) {
    console.error('[users] Route error:', err);
    return res.status(500).json({ error: 'Internal server error' });
}

// GET / - list all users (admin only)
router.get('/', authenticateJwt, requireRole('ADMIN'), async (req, res) => {
    const prisma = req.app.locals.prisma;
    try {
        const users = await prisma.user.findMany({
            select: safeUserSelect(),
            orderBy: { id: 'asc' },
        });
        res.json(users);
    } catch (err) {
        return respondServerError(res, err);
    }
});

// PUT /:id/change-password - change password after validating old password
router.put('/:id/change-password', authenticateJwt, async (req, res) => {
    const prisma = req.app.locals.prisma;
    const userId = parseId(req.params.id);
    const { oldPassword, newPassword } = req.body;
    if (!userId) {
        return res.status(400).json({ error: 'Invalid user id' });
    }
    if (!isOwnerOrRole(userId, req, 'ADMIN')) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    if (!oldPassword || !newPassword) {
        return res.status(400).json({ error: 'oldPassword and newPassword are required' });
    }
    const passwordCheck = validatePasswordPolicy(newPassword);
    if (!passwordCheck.valid) {
        return res.status(400).json({ error: passwordCheck.error });
    }
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, password: true },
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
        if (!isOldPasswordValid) {
            return res.status(400).json({ error: 'Old password is incorrect' });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });
        return res.json({ message: 'Password updated successfully' });
    } catch (err) {
        return respondServerError(res, err);
    }
});

// GET /:id - get user with orders (owner/admin)
router.get('/:id', authenticateJwt, async (req, res) => {
    const prisma = req.app.locals.prisma;
    const userId = parseId(req.params.id);
    if (!userId) {
        return res.status(400).json({ error: 'Invalid user id' });
    }
    if (!isOwnerOrRole(userId, req, 'ADMIN')) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                ...safeUserSelect(),
                orders: {
                    include: { items: { include: { product: true } } },
                    orderBy: { orderDate: 'desc' },
                },
            },
        });
        if (!user) return res.status(404).json({ error: 'User not found' });
        return res.json(user);
    } catch (err) {
        return respondServerError(res, err);
    }
});

// POST / - create user
router.post('/', async (req, res) => {
    const prisma = req.app.locals.prisma;
    const { name, password, address, preferences } = req.body;
    const email = String(req.body?.email || '').trim().toLowerCase();
    const normalizedPhone = normalizePhone(req.body?.phone);
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'name, email, and password are required' });
    }
    if (!validateEmailFormat(email)) {
        return res.status(400).json({ error: 'email format is invalid' });
    }
    if (req.body?.phone && !normalizedPhone) {
        return res.status(400).json({ error: 'phone format is invalid' });
    }
    const passwordCheck = validatePasswordPolicy(password);
    if (!passwordCheck.valid) {
        return res.status(400).json({ error: passwordCheck.error });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { name, email, password: hashedPassword, role: 'CUSTOMER', phone: normalizedPhone, address, preferences },
            select: safeUserSelect(),
        });
        const token = signUserToken(user);
        return res.status(201).json({ ...user, token });
    } catch (err) {
        if (err.code === 'P2002') {
            return res.status(409).json({ error: 'Email already exists' });
        }
        return respondServerError(res, err);
    }
});

// POST /login - sign in user
router.post('/login', async (req, res) => {
    const prisma = req.app.locals.prisma;
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const DUMMY_HASH = '$2a$10$7EqJtq98hPqEX7fNZaFWoOhi9A1j8GkRXKuX3sI5Yucs5cjox96D.';
    if (!email || !password.trim()) {
        return res.status(400).json({ error: 'email and password are required' });
    }
    try {
        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, name: true, email: true, password: true, role: true, phone: true, address: true, preferences: true, createdAt: true },
        });
        let validPassword = false;
        try {
            validPassword = await bcrypt.compare(password, user?.password || DUMMY_HASH);
        } catch (compareError) {
            console.error('Password comparison failed:', compareError);
            return res.status(500).json({ error: 'Unable to process login' });
        }
        if (!user || !validPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        const { password: _, ...safeUser } = user;
        const token = signUserToken(safeUser);
        return res.json({ ...safeUser, token });
    } catch (err) {
        return respondServerError(res, err);
    }
});

// PUT /:id - update user (owner/admin; role update admin only)
router.put('/:id', authenticateJwt, async (req, res) => {
    const prisma = req.app.locals.prisma;
    const userId = parseId(req.params.id);
    if (!userId) {
        return res.status(400).json({ error: 'Invalid user id' });
    }
    if (!isOwnerOrRole(userId, req, 'ADMIN')) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const { name, address, preferences, role } = req.body;
    const email = req.body?.email === undefined ? undefined : String(req.body.email || '').trim().toLowerCase();
    const phoneValue = req.body?.phone === undefined ? undefined : req.body?.phone;
    const data = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) {
        if (!email) {
            return res.status(400).json({ error: 'email is required' });
        }
        if (!validateEmailFormat(email)) {
            return res.status(400).json({ error: 'email format is invalid' });
        }
        data.email = email;
    }
    if (phoneValue !== undefined) {
        if (phoneValue === null || String(phoneValue).trim() === '') {
            data.phone = null;
        } else {
            const normalizedPhone = normalizePhone(phoneValue);
            if (!normalizedPhone) {
                return res.status(400).json({ error: 'phone format is invalid' });
            }
            data.phone = normalizedPhone;
        }
    }
    if (address !== undefined) data.address = address;
    if (preferences !== undefined) data.preferences = preferences;
    if (role !== undefined) {
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Only admins can update roles' });
        }
        data.role = role;
    }
    try {
        const user = await prisma.user.update({
            where: { id: userId },
            data,
            select: safeUserSelect(),
        });
        return res.json(user);
    } catch (err) {
        if (err.code === 'P2002') {
            return res.status(409).json({ error: 'Email already exists' });
        }
        return respondServerError(res, err);
    }
});

module.exports = router;
