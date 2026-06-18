const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const JWT_EXPIRES_IN = '24h';

/**
 * 生成 JWT Token
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      displayName: user.display_name
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * 验证 Token 中间件
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未授权，请先登录' });
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token 已过期，请重新登录' });
    }
    return res.status(401).json({ error: '无效的 Token' });
  }
}

/**
 * 角色验证中间件工厂
 * 用法：requireRole('admin', 'reviewer')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: '未授权' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: '权限不足，需要角色：' + roles.join('/') });
    }
    next();
  };
}

module.exports = { generateToken, authMiddleware, requireRole, JWT_SECRET };
