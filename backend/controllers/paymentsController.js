const prisma = require('../config/prisma');
const { broadcast } = require('../services/websocket');

exports.processPayment = async (req, res) => {
  try {
    const { bookingId, paymentMethod, amount } = req.body;
    const userId = req.user.id;

    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(bookingId) }
    });

    if (!booking || booking.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const payment = await prisma.payment.create({
      data: {
        userId,
        bookingId: parseInt(bookingId),
        paymentMethod: paymentMethod || 'pending',
        amount: parseFloat(amount),
        status: 'completed'
      }
    });

    await prisma.booking.update({
      where: { id: parseInt(bookingId) },
      data: { status: 'confirmed' }
    });

    broadcast({ type: 'payment_completed', payment });
    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUserPayments = async (req, res) => {
  try {
    const userId = req.user.id;

    const payments = await prisma.payment.findMany({
      where: { userId },
      include: {
        booking: {
          include: {
            slot: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const payment = await prisma.payment.findUnique({
      where: { id: parseInt(id) },
      include: {
        booking: {
          include: {
            slot: true
          }
        }
      }
    });

    if (!payment || payment.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
