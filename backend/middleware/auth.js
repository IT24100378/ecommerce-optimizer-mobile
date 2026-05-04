// JWT auth middleware and role helpers for protected routes.
const jwt = require('jsonwebtoken');

// Loads the JWT secret from environment config.
function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not configured');
    }
    return secret;
}

// Validates Bearer tokens and attaches user context to the request.
function authenticateJwt(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const decoded = jwt.verify(token, getJwtSecret());
        req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
        };
        return next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

// Creates a role-checking middleware for privileged routes.
function requireRole(...allowedRoles) {
    const roleSet = new Set(allowedRoles);
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (!roleSet.has(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        return next();
    };
}

// Checks if the request user is the owner or has an allowed role.
function isOwnerOrRole(targetUserId, req, ...allowedRoles) {
    if (!req.user) return false;
    if (String(req.user.id) === String(targetUserId)) return true;
    return allowedRoles.includes(req.user.role);
}

module.exports = {
    authenticateJwt,
    requireRole,
    isOwnerOrRole,
    getJwtSecret,
};
