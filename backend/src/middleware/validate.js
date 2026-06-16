const { validationResult } = require('express-validator');

/**
 * 验证中间件 - express-validator 校验结果处理
 * 用在路由校验规则链的最后
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: '参数校验失败',
      details: errors.array().map(e => ({ field: e.path, message: e.msg }))
    });
  }
  next();
}

module.exports = { validate };
