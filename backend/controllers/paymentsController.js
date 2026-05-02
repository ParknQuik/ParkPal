const prisma = require('../config/prisma');
const { broadcast } = require('../services/websocket');
const paymongoService = require('../services/paymongo');
const crypto = require('crypto');

function generateSecureToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create a payment intent for a booking
 * Step 1: Driver selects payment method (GCash/Card)
 * Step 2: Backend creates PaymentIntent
 * Step 3: Frontend displays payment UI
 */
exports.createPaymentIntent = async (req, res) => {
  try {
    const { bookingId, amount, paymentMethod } = req.body;
    const userId = req.user.id;

    // Verify booking exists and belongs to user
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(bookingId) },
      include: { slot: true }
    });

    if (!booking || booking.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized - booking not found or not yours' });
    }

    if (booking.status === 'confirmed') {
      return res.status(400).json({ error: 'Booking already paid' });
    }

    if (paymentMethod === 'cash') {
      const cashToken = generateSecureToken();
      
      const payment = await prisma.payment.create({
        data: {
          userId,
          bookingId: parseInt(bookingId),
          paymentMethod: 'cash',
          amount: parseFloat(amount),
          status: 'pending',
          transactionId: `cash_${cashToken}`
        }
      });

      return res.json({
        paymentIntentId: `cash_${cashToken}`,
        message: 'Cash payment selected. Pay at location.',
        requiresPayment: false,
        amount: parseFloat(amount),
        bookingId: parseInt(bookingId),
        paymentId: payment.id
      });
    }

    // Determine capture type based on rental mode
    const isOpenMode = booking.rentalMode === 'open';
    const captureType = isOpenMode ? 'manual' : 'automatic';

    // Create PaymentIntent with PayMongo
    const result = await paymongoService.createPaymentIntent({
      amount: parseFloat(amount),
      description: `Parking at ${booking.slot.address} - Booking #${bookingId}`,
      captureType: captureType,
      metadata: {
        bookingId: bookingId.toString(),
        userId: userId.toString(),
        slotId: booking.slotId.toString(),
        paymentMethod: paymentMethod || 'unknown',
        rentalMode: booking.rentalMode,
        ...(isOpenMode && { 
          authorizationOnly: true,
          maxAmount: booking.authAmount 
        })
      }
    });

    if (!result.success) {
      console.error('PayMongo payment intent creation failed:', result.error);
      return res.status(500).json({
        error: 'Failed to create payment intent',
        details: result.error.message
      });
    }

    // Save payment record as pending
    const payment = await prisma.payment.create({
      data: {
        userId,
        bookingId: parseInt(bookingId),
        paymentMethod: paymentMethod || 'pending',
        amount: parseFloat(amount),
        status: 'pending',
        metadata: {
          paymentIntentId: result.paymentIntent.id,
          clientKey: result.paymentIntent.attributes.client_key,
          captureType: captureType
        }
      }
    });

    // For open mode, store authId in booking for later capture
    if (isOpenMode) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { authId: result.paymentIntent.id }
      });
    }

    // Return client secret for frontend
    res.status(201).json({
      paymentId: payment.id,
      paymentIntentId: result.paymentIntent.id,
      clientKey: result.paymentIntent.attributes.client_key,
      amount: parseFloat(amount),
      status: result.paymentIntent.attributes.status,
      captureType: captureType,
      message: isOpenMode 
        ? 'Authorization hold created - amount will be captured on checkout'
        : 'Payment intent created - proceed with payment'
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Confirm payment after user completes payment on frontend
 * Called by mobile app after PayMongo payment flow completes
 */
exports.confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    const userId = req.user.id;

    if (paymentIntentId.startsWith('cash_')) {
      const cashToken = paymentIntentId.replace('cash_', '');
      
      const payment = await prisma.payment.findFirst({
        where: {
          transactionId: paymentIntentId,
          status: 'pending'
        },
        include: { 
          booking: {
            include: { slot: true }
          }
        }
      });
      
      if (!payment) {
        return res.status(404).json({ error: 'Payment not found or already confirmed' });
      }
      
      const booking = payment.booking;
      
      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      
      if (booking.userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      
      const updatedPayment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'pending',
          paymentMethod: 'cash'
        }
      });
      
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'confirmed' }
      });
      
      await prisma.notification.create({
        data: {
          userId: booking.slot?.ownerId,
          title: 'Booking Confirmed - Cash Payment',
          body: `Booking #${booking.id} confirmed. Guest will pay in cash.`,
          type: 'booking_confirmed',
          data: JSON.stringify({ bookingId: booking.id, paymentMethod: 'cash' })
        }
      });

      return res.json({
        message: 'Booking confirmed. Please collect cash payment from customer.',
        payment: updatedPayment,
        booking: { ...booking, status: 'confirmed' }
      });
    }

    // Retrieve PaymentIntent from PayMongo
    const result = await paymongoService.getPaymentIntent(paymentIntentId);

    if (!result.success) {
      return res.status(500).json({
        error: 'Failed to verify payment',
        details: result.error.message
      });
    }

    const paymentIntent = result.paymentIntent;
    const status = paymentIntent.attributes.status;

    // Find our payment record
    const payment = await prisma.payment.findFirst({
      where: {
        metadata: {
          path: ['paymentIntentId'],
          equals: paymentIntentId
        }
      },
      include: { booking: true }
    });

    if (!payment || payment.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Update payment status based on PayMongo status
    let paymentStatus = 'pending';
    let bookingStatus = payment.booking.status;

    // Check if this is a manual capture (authorization hold)
    const isManualCapture = payment.metadata?.captureType === 'manual';

    if (status === 'succeeded') {
      paymentStatus = 'completed';
      bookingStatus = 'confirmed';
    } else if (status === 'awaiting_capture') {
      // For manual capture, payment is authorized but not yet captured
      paymentStatus = 'authorized';
      bookingStatus = 'confirmed';
    } else if (status === 'processing') {
      paymentStatus = 'processing';
    } else if (status === 'requires_payment_method' || status === 'canceled') {
      paymentStatus = 'failed';
    }

    // Update payment record
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: paymentStatus,
        metadata: {
          ...payment.metadata,
          paymongoStatus: status,
          confirmedAt: new Date().toISOString()
        }
      }
    });

    // Update booking status if payment succeeded or authorized
    if (paymentStatus === 'completed' || paymentStatus === 'authorized') {
      await prisma.booking.update({
        where: { id: payment.bookingId },
        data: { status: bookingStatus }
      });

      broadcast({
        type: paymentStatus === 'authorized' ? 'payment_authorized' : 'payment_completed',
        payment: updatedPayment,
        bookingId: payment.bookingId
      });
    }

    res.json({
      paymentId: updatedPayment.id,
      status: paymentStatus,
      bookingStatus: bookingStatus,
      message: paymentStatus === 'completed'
        ? 'Payment successful! Booking confirmed.'
        : paymentStatus === 'authorized'
        ? 'Payment authorized! Amount will be captured on checkout.'
        : `Payment ${paymentStatus}`
    });
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Create GCash payment source (for direct GCash payments)
 */
exports.createGCashPayment = async (req, res) => {
  try {
    const { bookingId, amount } = req.body;
    const userId = req.user.id;

    // Verify booking
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(bookingId) },
      include: { slot: true }
    });

    if (!booking || booking.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Create GCash source
    const sourceResult = await paymongoService.createSource({
      amount: parseFloat(amount),
      type: 'gcash',
      redirect: {
        success: `${process.env.FRONTEND_URL}/payment/success?bookingId=${bookingId}`,
        failed: `${process.env.FRONTEND_URL}/payment/failed?bookingId=${bookingId}`
      }
    });

    if (!sourceResult.success) {
      return res.status(500).json({
        error: 'Failed to create GCash payment',
        details: sourceResult.error.message
      });
    }

    // Save payment record
    const payment = await prisma.payment.create({
      data: {
        userId,
        bookingId: parseInt(bookingId),
        paymentMethod: 'gcash',
        amount: parseFloat(amount),
        status: 'pending',
        metadata: {
          sourceId: sourceResult.source.id,
          checkoutUrl: sourceResult.source.attributes.redirect.checkout_url
        }
      }
    });

    // Return checkout URL for user to complete payment
    res.status(201).json({
      paymentId: payment.id,
      checkoutUrl: sourceResult.source.attributes.redirect.checkout_url,
      message: 'Redirect user to GCash payment page'
    });
  } catch (error) {
    console.error('Create GCash payment error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Process legacy payment (backward compatibility)
 * TODO: Deprecated - use createPaymentIntent instead
 */
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

/**
 * Get all payments for the authenticated user
 */
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

/**
 * Get a specific payment by ID
 */
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

/**
 * Handle PayMongo webhooks
 * Webhook events: payment.paid, payment.failed, source.chargeable
 * Note: This endpoint uses express.raw() so req.body is a Buffer
 */
exports.handleWebhook = async (req, res) => {
  try {
    const signature = req.headers['paymongo-signature'];
    const rawBody = req.body.toString('utf-8');

    // Verify webhook signature using RAW body (not re-serialized JSON)
    const isValid = paymongoService.verifyWebhookSignature(rawBody, signature);

    if (!isValid) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Parse JSON payload after signature verification
    const payload = JSON.parse(rawBody);
    const event = payload.data;
    const eventType = event.attributes.type;

    console.log(`📨 PayMongo webhook received: ${eventType}`);

    switch (eventType) {
      case 'payment.paid':
        await handlePaymentPaid(event.attributes.data);
        break;

      case 'payment.failed':
        await handlePaymentFailed(event.attributes.data);
        break;

      case 'source.chargeable':
        await handleSourceChargeable(event.attributes.data);
        break;

      default:
        console.log(`Unhandled webhook event: ${eventType}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Webhook handler: Payment succeeded
 * @private
 */
async function handlePaymentPaid(paymentData) {
  const paymentIntentId = paymentData.attributes.payment_intent_id;

  // Find payment record
  const payment = await prisma.payment.findFirst({
    where: {
      metadata: {
        path: ['paymentIntentId'],
        equals: paymentIntentId
      }
    }
  });

  if (!payment) {
    console.error('Payment record not found for PaymentIntent:', paymentIntentId);
    return;
  }

  // Update payment and booking
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'completed',
      metadata: {
        ...payment.metadata,
        paidAt: new Date().toISOString()
      }
    }
  });

  await prisma.booking.update({
    where: { id: payment.bookingId },
    data: { status: 'confirmed' }
  });

  broadcast({
    type: 'payment_completed',
    paymentId: payment.id,
    bookingId: payment.bookingId
  });

  console.log(`✅ Payment completed: Payment #${payment.id}, Booking #${payment.bookingId}`);
}

/**
 * Webhook handler: Payment failed
 * @private
 */
async function handlePaymentFailed(paymentData) {
  const paymentIntentId = paymentData.attributes.payment_intent_id;

  const payment = await prisma.payment.findFirst({
    where: {
      metadata: {
        path: ['paymentIntentId'],
        equals: paymentIntentId
      }
    }
  });

  if (!payment) {
    console.error('Payment record not found for PaymentIntent:', paymentIntentId);
    return;
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'failed',
      metadata: {
        ...payment.metadata,
        failedAt: new Date().toISOString(),
        failureReason: paymentData.attributes.last_payment_error?.message || 'Unknown error'
      }
    }
  });

  console.log(`❌ Payment failed: Payment #${payment.id}`);
}

/**
 * Webhook handler: GCash source is chargeable
 * @private
 */
async function handleSourceChargeable(sourceData) {
  const sourceId = sourceData.id;

  // Find payment with this source
  const payment = await prisma.payment.findFirst({
    where: {
      metadata: {
        path: ['sourceId'],
        equals: sourceId
      }
    }
  });

  if (!payment) {
    console.error('Payment record not found for Source:', sourceId);
    return;
  }

  // Create payment using the source
  const result = await paymongoService.createPayment({
    amount: payment.amount,
    sourceId: sourceId,
    description: `Parking Booking #${payment.bookingId}`
  });

  if (result.success) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'processing',
        metadata: {
          ...payment.metadata,
          paymentId: result.payment.id
        }
      }
    });

    console.log(`🔄 GCash payment processing: Payment #${payment.id}`);
  } else {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'failed' }
    });

    console.error(`❌ Failed to charge GCash source: Payment #${payment.id}`);
  }
}
