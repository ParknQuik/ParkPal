const prisma = require('../config/prisma');
exports.processPayment = async (req, res) => {
  // TODO: Validate JWT, sanitize input
  const { booking_id, method, amount } = req.body;
  // Payment logic here
  res.json({ success: true });
};
