const authMiddleware = (req, res, next) => {
  // Ví dụ: Kiểm tra token (chưa triển khai)
  next();
};

module.exports = authMiddleware;