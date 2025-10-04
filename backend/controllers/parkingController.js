const prisma = require('../config/prisma');
const { broadcast } = require('../services/websocket');

exports.getSlots = async (req, res) => {
  try {
    const { status, lat, lon, radius } = req.query;

    const where = {};
    if (status) where.status = status;

    const slots = await prisma.slot.findMany({
      where,
      include: {
        owner: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.json(slots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getSlotById = async (req, res) => {
  try {
    const { id } = req.params;
    const slot = await prisma.slot.findUnique({
      where: { id: parseInt(id) },
      include: {
        owner: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!slot) {
      return res.status(404).json({ error: 'Slot not found' });
    }

    res.json(slot);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.listSlot = async (req, res) => {
  try {
    const { lat, lon, price, address } = req.body;
    const ownerId = req.user.id;

    const slot = await prisma.slot.create({
      data: {
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        price: parseFloat(price),
        address,
        status: 'available',
        ownerId
      }
    });

    broadcast({ type: 'slot_listed', slot });
    res.status(201).json(slot);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateSlot = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, price, address } = req.body;
    const ownerId = req.user.id;

    const slot = await prisma.slot.findUnique({ where: { id: parseInt(id) } });

    if (!slot || slot.ownerId !== ownerId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updated = await prisma.slot.update({
      where: { id: parseInt(id) },
      data: { status, price, address }
    });

    broadcast({ type: 'slot_updated', slot: updated });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteSlot = async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user.id;

    const slot = await prisma.slot.findUnique({ where: { id: parseInt(id) } });

    if (!slot || slot.ownerId !== ownerId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await prisma.slot.delete({ where: { id: parseInt(id) } });

    broadcast({ type: 'slot_deleted', slotId: parseInt(id) });
    res.json({ message: 'Slot deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.reserveSlot = async (req, res) => {
  try {
    const { slotId, startTime, endTime } = req.body;
    const userId = req.user.id;

    const slot = await prisma.slot.findUnique({
      where: { id: parseInt(slotId) }
    });

    if (!slot || slot.status !== 'available') {
      return res.status(400).json({ error: 'Slot not available' });
    }

    const booking = await prisma.booking.create({
      data: {
        slotId: parseInt(slotId),
        userId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        price: slot.price,
        status: 'pending'
      }
    });

    await prisma.slot.update({
      where: { id: parseInt(slotId) },
      data: { status: 'reserved' }
    });

    broadcast({ type: 'slot_reserved', booking });
    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUserBookings = async (req, res) => {
  try {
    const userId = req.user.id;

    const bookings = await prisma.booking.findMany({
      where: { userId },
      include: {
        slot: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
