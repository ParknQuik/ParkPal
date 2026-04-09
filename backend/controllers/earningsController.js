/**
 * Get earnings summary for the authenticated slot owner
 * Returns total, pending, and paid amounts
 */
exports.getEarningsSummary = async (req, res) => {
  try {
    const userId = req.user.id;

    // Mock data - replace with actual DB queries joining bookings/payments/slots
    const summary = {
      total: 15750.0,
      pending: 3200.0,
      paid: 12550.0,
      currency: 'PHP',
      thisMonth: {
        total: 4500.0,
        pending: 1200.0,
        paid: 3300.0
      },
      lastMonth: {
        total: 5800.0,
        pending: 0,
        paid: 5800.0
      },
      activeSlots: 5,
      totalBookings: 47
    };

    res.json(summary);
  } catch (error) {
    console.error('Get earnings summary error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get transaction history with pagination
 */
exports.getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status; // optional filter: pending, completed, paid_out

    // Mock data - replace with actual DB queries
    const allTransactions = [
      {
        id: 1,
        bookingId: 101,
        slotName: 'Slot A - Main St Parking',
        driverName: 'Juan Dela Cruz',
        amount: 350.0,
        status: 'completed',
        paymentMethod: 'gcash',
        hours: 2,
        createdAt: '2026-03-30T08:30:00Z'
      },
      {
        id: 2,
        bookingId: 102,
        slotName: 'Slot B - Main St Parking',
        driverName: 'Maria Santos',
        amount: 525.0,
        status: 'pending',
        paymentMethod: 'card',
        hours: 3,
        createdAt: '2026-03-31T14:00:00Z'
      },
      {
        id: 3,
        bookingId: 103,
        slotName: 'Slot A - Main St Parking',
        driverName: 'Pedro Reyes',
        amount: 175.0,
        status: 'completed',
        paymentMethod: 'gcash',
        hours: 1,
        createdAt: '2026-03-29T10:15:00Z'
      },
      {
        id: 4,
        bookingId: 104,
        slotName: 'Slot C - Oak Ave Lot',
        driverName: 'Ana Garcia',
        amount: 700.0,
        status: 'paid_out',
        paymentMethod: 'card',
        hours: 4,
        createdAt: '2026-03-28T07:00:00Z'
      },
      {
        id: 5,
        bookingId: 105,
        slotName: 'Slot B - Main St Parking',
        driverName: 'Carlos Mendoza',
        amount: 262.5,
        status: 'completed',
        paymentMethod: 'gcash',
        hours: 1.5,
        createdAt: '2026-03-27T16:45:00Z'
      },
      {
        id: 6,
        bookingId: 106,
        slotName: 'Slot A - Main St Parking',
        driverName: 'Liza Torres',
        amount: 350.0,
        status: 'paid_out',
        paymentMethod: 'card',
        hours: 2,
        createdAt: '2026-03-26T09:00:00Z'
      }
    ];

    let filtered = allTransactions;
    if (status) {
      filtered = allTransactions.filter((t) => t.status === status);
    }

    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    res.json({
      transactions: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get earnings analytics (weekly/monthly trends)
 */
exports.getAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;
    const period = req.query.period || 'monthly'; // 'weekly' or 'monthly'

    // Mock data - replace with actual aggregated DB queries
    const analytics = {
      period,
      weekly: [
        { week: '2026-W09', earnings: 1200.0, bookings: 4 },
        { week: '2026-W10', earnings: 1800.0, bookings: 6 },
        { week: '2026-W11', earnings: 2100.0, bookings: 7 },
        { week: '2026-W12', earnings: 1500.0, bookings: 5 },
        { week: '2026-W13', earnings: 2400.0, bookings: 8 }
      ],
      monthly: [
        { month: '2025-11', earnings: 4200.0, bookings: 14 },
        { month: '2025-12', earnings: 3800.0, bookings: 12 },
        { month: '2026-01', earnings: 5100.0, bookings: 17 },
        { month: '2026-02', earnings: 4600.0, bookings: 15 },
        { month: '2026-03', earnings: 5800.0, bookings: 19 }
      ],
      topSlots: [
        { slotId: 1, slotName: 'Slot A - Main St Parking', earnings: 6300.0, bookings: 18 },
        { slotId: 2, slotName: 'Slot B - Main St Parking', earnings: 5250.0, bookings: 15 },
        { slotId: 3, slotName: 'Slot C - Oak Ave Lot', earnings: 4200.0, bookings: 14 }
      ],
      averagePerBooking: 335.1,
      peakHour: '09:00 - 11:00'
    };

    res.json(analytics);
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Request a payout for accumulated earnings
 */
exports.requestPayout = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, method, accountDetails } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid payout amount' });
    }

    if (!method) {
      return res.status(400).json({ error: 'Payout method is required' });
    }

    // Mock available balance check - replace with actual DB query
    const availableBalance = 12550.0;

    if (amount > availableBalance) {
      return res.status(400).json({
        error: 'Insufficient available balance',
        availableBalance
      });
    }

    // Mock payout creation - replace with actual DB insert
    const payout = {
      id: Math.floor(Math.random() * 10000),
      userId,
      amount,
      method,
      status: 'processing',
      referenceNumber: `PAY-${Date.now()}`,
      estimatedArrival: '1-3 business days',
      createdAt: new Date().toISOString()
    };

    res.status(201).json({
      message: 'Payout request submitted successfully',
      payout
    });
  } catch (error) {
    console.error('Request payout error:', error);
    res.status(500).json({ error: error.message });
  }
};
