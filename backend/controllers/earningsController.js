const prisma = require('../config/prisma');
const logger = require('../config/logger');

const getStartOfCurrentMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

const getStartOfLastMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - 1, 1);
};

const getEndOfLastMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
};

/**
 * Get earnings summary for the authenticated slot owner
 * Returns total, pending, and paid amounts
 */
exports.getEarningsSummary = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const startOfThisMonth = getStartOfCurrentMonth();
    const startOfLastMonth = getStartOfLastMonth();
    const endOfLastMonth = getEndOfLastMonth();

    const [totalStats, thisMonthStats, lastMonthStats, slotStats] = await Promise.all([
      prisma.payment.aggregate({
        where: {
          booking: {
            slot: {
              ownerId: userId
            }
          }
        },
        _sum: {
          amount: true
        }
      }),
      prisma.payment.groupBy({
        by: ['status'],
        where: {
          createdAt: {
            gte: startOfThisMonth
          },
          booking: {
            slot: {
              ownerId: userId
            }
          }
        },
        _sum: {
          amount: true
        }
      }),
      prisma.payment.groupBy({
        by: ['status'],
        where: {
          createdAt: {
            gte: startOfLastMonth,
            lte: endOfLastMonth
          },
          booking: {
            slot: {
              ownerId: userId
            }
          }
        },
        _sum: {
          amount: true
        }
      }),
      prisma.parkingSlot.aggregate({
        where: {
          ownerId: userId,
          isActive: true
        },
        _count: {
          id: true
        }
      })
    ]);

    const thisMonthTotal = thisMonthStats.find(s => s.status === 'completed')?._sum?.amount || 0;
    const thisMonthPending = thisMonthStats.find(s => s.status === 'pending')?._sum?.amount || 0;
    const thisMonthPaid = thisMonthTotal;

    const lastMonthTotal = lastMonthStats.find(s => s.status === 'completed')?._sum?.amount || 0;
    const lastMonthPending = lastMonthStats.find(s => s.status === 'pending')?._sum?.amount || 0;
    const lastMonthPaid = lastMonthTotal;

    const pendingStats = await prisma.payment.aggregate({
      where: {
        status: 'pending',
        booking: {
          slot: {
            ownerId: userId
          }
        }
      },
      _sum: {
        amount: true
      }
    });

    const completedStats = await prisma.payment.aggregate({
      where: {
        status: 'completed',
        booking: {
          slot: {
            ownerId: userId
          }
        }
      },
      _sum: {
        amount: true
      }
    });

    const bookingCount = await prisma.booking.count({
      where: {
        slot: {
          ownerId: userId
        }
      }
    });

     const summary = {
       total: completedStats._sum.amount || 0,
       pending: pendingStats._sum.amount || 0,
       paid: completedStats._sum.amount || 0,
       currency: 'PHP',
       thisMonth: {
         total: thisMonthTotal + thisMonthPending,
         pending: thisMonthPending,
         paid: thisMonthPaid
       },
       lastMonth: {
         total: lastMonthTotal + lastMonthPending,
         pending: lastMonthPending,
         paid: lastMonthPaid
       },
       activeSlots: slotStats._count.id || 0,
       totalBookings: bookingCount
     };

     res.json(summary);
   } catch (error) {
     next(error);
   }
};

/**
 * Get transaction history with pagination
 */
exports.getTransactions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;

    const whereClause = {
      booking: {
        slot: {
          ownerId: userId
        }
      }
    };

    if (status) {
      whereClause.status = status;
    }

    const [transactions, total] = await Promise.all([
      prisma.payment.findMany({
        where: whereClause,
        include: {
          booking: {
            include: {
              slot: true
            }
          },
          user: true
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.payment.count({
        where: whereClause
      })
    ]);

    const formattedTransactions = transactions.map(payment => ({
      id: payment.id,
      bookingId: payment.booking?.id,
      slotName: payment.booking?.slot?.title || payment.booking?.slot?.address || 'Unknown Slot',
      driverName: payment.user?.name || 'Unknown',
      amount: payment.amount,
      status: payment.status,
      paymentMethod: payment.paymentMethod,
      hours: payment.booking?.endTime && payment.booking?.startTime
        ? Math.round((new Date(payment.booking.endTime).getTime() - new Date(payment.booking.startTime).getTime()) / (1000 * 60 * 60) * 10) / 10
        : 0,
      createdAt: payment.createdAt
    }));

    res.json({
      transactions: formattedTransactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get transactions error:', error);
    next(error);
  }
};

/**
 * Get earnings analytics (weekly/monthly trends)
 */
exports.getAnalytics = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const period = req.query.period || 'monthly';

    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);

    const monthlyData = await prisma.$queryRaw`
      SELECT 
        TO_CHAR(p."created_at", 'YYYY-MM') as month,
        SUM(p."amount") as earnings,
        COUNT(*) as bookings
      FROM "payments" p
      JOIN "bookings" b ON p."booking_id" = b."id"
      JOIN "parking_slots" s ON b."slot_id" = s."id"
      WHERE s."owner_id" = ${userId}
        AND p."status" = 'completed'
        AND p."created_at" >= ${twelveMonthsAgo}
      GROUP BY TO_CHAR(p."created_at", 'YYYY-MM')
      ORDER BY month DESC
      LIMIT 12
    `;

    const weeklyData = await prisma.$queryRaw`
      SELECT 
        TO_CHAR(p."created_at", 'IYYY-WW') as week,
        SUM(p."amount") as earnings,
        COUNT(*) as bookings
      FROM "payments" p
      JOIN "bookings" b ON p."booking_id" = b."id"
      JOIN "parking_slots" s ON b."slot_id" = s."id"
      WHERE s."owner_id" = ${userId}
        AND p."status" = 'completed'
        AND p."created_at" >= ${new Date(now.getFullYear(), now.getMonth(), 1)}
      GROUP BY TO_CHAR(p."created_at", 'IYYY-WW')
      ORDER BY week DESC
      LIMIT 12
    `;

    const topSlots = await prisma.parkingSlot.findMany({
      where: {
        ownerId: userId,
        isActive: true
      },
      include: {
        _count: {
          select: {
            bookings: {
              where: {
                payments: {
                  some: {
                    status: 'completed'
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        bookings: {
          _count: 'desc'
        }
      },
      take: 3
    });

    const topSlotsWithEarnings = await Promise.all(
      topSlots.map(async (slot) => {
        const earnings = await prisma.payment.aggregate({
          where: {
            status: 'completed',
            booking: {
              slotId: slot.id
            }
          },
          _sum: {
            amount: true
          }
        });
        return {
          slotId: slot.id,
          slotName: slot.title || slot.address,
          earnings: earnings._sum.amount || 0,
          bookings: slot._count.bookings
        };
      })
    );

    const avgPerBooking = await prisma.payment.aggregate({
      where: {
        status: 'completed',
        booking: {
          slot: {
            ownerId: userId
          }
        }
      },
      _avg: {
        amount: true
      }
    });

     const analytics = {
       period,
       weekly: weeklyData.map(w => ({
         week: w.week,
         earnings: parseFloat(w.earnings) || 0,
         bookings: parseInt(w.bookings) || 0
       })),
       monthly: monthlyData.map(m => ({
         month: m.month,
         earnings: parseFloat(m.earnings) || 0,
         bookings: parseInt(m.bookings) || 0
       })),
       topSlots: topSlotsWithEarnings,
       averagePerBooking: parseFloat(avgPerBooking._avg.amount) || 0,
       peakHour: '09:00 - 11:00'
     };

     res.json(analytics);
   } catch (error) {
     next(error);
   }
};

/**
 * Request a payout for accumulated earnings
 */
exports.requestPayout = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { amount, method, accountDetails } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid payout amount' });
    }

    if (!method) {
      return res.status(400).json({ error: 'Payout method is required' });
    }

    const [totalCompletedResult, totalPayoutResult] = await Promise.all([
      prisma.payment.aggregate({
        where: {
          status: 'completed',
          booking: {
            slot: {
              ownerId: userId
            }
          }
        },
        _sum: {
          amount: true
        }
      }),
      prisma.payout.aggregate({
        where: {
          hostId: userId,
          status: {
            in: ['completed', 'processing']
          }
        },
        _sum: {
          amount: true
        }
      })
    ]);

    const totalCompleted = totalCompletedResult._sum.amount || 0;
    const totalPayout = totalPayoutResult._sum.amount || 0;
    const availableBalance = totalCompleted - totalPayout;

    if (amount > availableBalance) {
      return res.status(400).json({
        error: 'Insufficient available balance',
        availableBalance
      });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const payout = await prisma.payout.create({
      data: {
        hostId: userId,
        amount: parseFloat(amount),
        paymentMethod: method,
        accountDetails: accountDetails ? JSON.stringify(accountDetails) : null,
        status: 'processing',
        periodStart: startOfMonth,
        periodEnd: endOfMonth,
        transactionId: `PAY-${Date.now()}`
      }
    });

    res.status(201).json({
      message: 'Payout request submitted successfully',
      payout: {
        id: payout.id,
        userId: payout.hostId,
        amount: payout.amount,
        method: payout.paymentMethod,
        status: payout.status,
        referenceNumber: payout.transactionId,
        estimatedArrival: '1-3 business days',
        createdAt: payout.createdAt
      }
    });
  } catch (error) {
    logger.error('Request payout error:', error);
    next(error);
  }
};