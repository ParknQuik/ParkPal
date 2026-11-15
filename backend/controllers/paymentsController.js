const prisma = require('../config/prisma');
const { broadcast } = require('../services/websocket');
const paymongoService = require('../services/paymongo');
const crypto = require('crypto');

function generateSecureToken() {
  return crypto.randomBytes(32).toString('hex');
}

const ACTIVE_PAYMENT_STATES = ['pending', 'processing', 'authorized'];
function providerPaymentStatus(status) {
  if (status === 'succeeded') return 'completed';
  if (status === 'awaiting_capture') return 'authorized';
  if (status === 'processing' || status === 'awaiting_next_action' || status === 'awaiting_payment_method') return 'processing';
  if (status === 'canceled' || status === 'cancelled') return 'cancelled';
  if (status === 'requires_payment_method') return 'failed';
  return 'pending';
}

/**
 * Create a payment intent for a booking
 * Step 1: Driver selects payment method (GCash/Card)
 * Step 2: Backend creates PaymentIntent
 * Step 3: Frontend displays payment UI
 */
exports.createPaymentIntent = async (req, res, next) => {
  try {
    const { bookingId, paymentMethod } = req.body;
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
    if (['completed', 'cancelled'].includes(booking.status)) {
      return res.status(409).json({ error: `Booking is ${booking.status} and cannot be paid` });
    }

    const existing = await prisma.payment.findFirst({
      where: { bookingId: booking.id, userId, purpose: 'booking', status: { in: ACTIVE_PAYMENT_STATES } },
      orderBy: { createdAt: 'desc' }
    });
    if (existing) {
      if (existing.paymentMethod !== paymentMethod) return res.status(409).json({ error: 'Another payment method already has an active payment for this booking' });
      if (paymentMethod === 'cash') return res.status(200).json({ paymentIntentId: existing.transactionId, message: 'Cash payment selected. Pay at location.', requiresPayment: false, amount: existing.amount, bookingId: booking.id, paymentId: existing.id });
      const currentIntent = await paymongoService.getPaymentIntent(existing.transactionId);
      if (currentIntent.success) {
        const attrs = currentIntent.paymentIntent.attributes;
        const currentStatus = providerPaymentStatus(attrs.status);
        if (currentStatus === 'completed' || currentStatus === 'authorized') {
          await prisma.$transaction(async (tx) => {
            await tx.payment.update({ where: { id: existing.id }, data: { status: currentStatus } });
            await tx.booking.update({ where: { id: booking.id }, data: { status: 'confirmed' } });
          });
          return res.status(200).json({ paymentId: existing.id, paymentIntentId: existing.transactionId, clientKey: attrs.client_key, publicKey: paymongoService.publicKey, amount: existing.amount, status: attrs.status, captureType: booking.rentalMode === 'open' ? 'manual' : 'automatic' });
        } else if (!ACTIVE_PAYMENT_STATES.includes(currentStatus)) {
          await prisma.payment.update({ where: { id: existing.id }, data: { status: currentStatus } });
        } else {
          return res.status(200).json({
            paymentId: existing.id, paymentIntentId: existing.transactionId,
            clientKey: attrs.client_key, publicKey: paymongoService.publicKey,
            amount: existing.amount, status: attrs.status, captureType: booking.rentalMode === 'open' ? 'manual' : 'automatic'
          });
        }
      }
    }

    // Booking amounts are stored in PHP. Never accept a payable amount from the browser.
    const payableAmount = Number((booking.rentalMode === 'open' ? (booking.authAmount || booking.price + (booking.platformFee || 0)) : (booking.price + (booking.platformFee || 0))).toFixed(2));
    if (!Number.isFinite(payableAmount) || payableAmount < 1) {
      return res.status(400).json({ error: 'Booking amount is not payable' });
    }

    if (paymentMethod === 'cash') {
      const cashToken = generateSecureToken();
      
      const payment = await prisma.payment.create({
        data: {
          userId,
          bookingId: parseInt(bookingId),
          paymentMethod: 'cash',
          amount: payableAmount,
          status: 'pending',
          transactionId: `cash_${cashToken}`,
          purpose: 'booking'
        }
      });

      return res.json({
        paymentIntentId: `cash_${cashToken}`,
        message: 'Cash payment selected. Pay at location.',
        requiresPayment: false,
        amount: payableAmount,
        bookingId: parseInt(bookingId),
        paymentId: payment.id
      });
    }

    // Determine capture type based on rental mode
    const isOpenMode = booking.rentalMode === 'open';
    const captureType = isOpenMode ? 'manual' : 'automatic';

    // Create PaymentIntent with PayMongo
    const result = await paymongoService.createPaymentIntent({
      amount: payableAmount,
      description: `Parking at ${booking.slot.address} - Booking #${bookingId}`,
      captureType: captureType,
      metadata: {
        bookingId: bookingId.toString(),
        userId: userId.toString(),
        slotId: booking.slotId.toString(),
        paymentMethod: paymentMethod || 'unknown',
        rentalMode: booking.rentalMode,
        purpose: 'booking',
        ...(isOpenMode && { 
          authorizationOnly: true,
          maxAmount: booking.authAmount 
        })
      }
    });

    if (!result.success) {
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
        amount: payableAmount,
        status: 'pending',
        transactionId: result.paymentIntent.id,
        purpose: 'booking'
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
      publicKey: paymongoService.publicKey,
      amount: payableAmount,
      status: result.paymentIntent.attributes.status,
      captureType: captureType,
      message: isOpenMode 
        ? 'Authorization hold created - amount will be captured on checkout'
        : 'Payment intent created - proceed with payment'
    });
   } catch (error) {
     if (error.code === 'P2002') return res.status(409).json({ error: 'A payment is already being processed for this booking. Retry to reuse it.' });
     next(error);
   }
};

exports.createExtensionIntent = async (req, res, next) => {
  try {
    const { bookingId, hours, paymentMethod } = req.body;
    const userId = req.user.id;
    const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { slot: true } });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.userId !== userId) return res.status(403).json({ error: 'Unauthorized' });
    if (booking.rentalMode !== 'fixed' || ['completed', 'cancelled'].includes(booking.status) || !booking.endTime || new Date(booking.endTime) < new Date()) {
      return res.status(400).json({ error: 'Booking cannot be extended' });
    }
    const base = Number((booking.slot.price * hours).toFixed(2));
    const amount = Number((base + 10 + base * 0.05).toFixed(2));
    const active = await prisma.payment.findFirst({ where: { bookingId, userId, purpose: 'extension', extensionHours: hours, status: { in: ACTIVE_PAYMENT_STATES } } });
    if (active) {
      const existing = await paymongoService.getPaymentIntent(active.transactionId);
      if (existing.success) {
        const currentStatus = providerPaymentStatus(existing.paymentIntent.attributes.status);
        if (ACTIVE_PAYMENT_STATES.includes(currentStatus) || currentStatus === 'completed' || currentStatus === 'authorized') {
          if (currentStatus === 'completed' || currentStatus === 'authorized') await prisma.payment.update({ where: { id: active.id }, data: { status: currentStatus } });
          return res.status(200).json({ paymentId: active.id, paymentIntentId: active.transactionId, clientKey: existing.paymentIntent.attributes.client_key, publicKey: paymongoService.publicKey, amount, hours, status: existing.paymentIntent.attributes.status });
        }
        await prisma.payment.update({ where: { id: active.id }, data: { status: currentStatus } });
      }
    }
    const created = await paymongoService.createPaymentIntent({
      amount, description: `Booking #${bookingId} extension (${hours} hours)`, captureType: 'automatic',
      metadata: { bookingId: String(bookingId), userId: String(userId), purpose: 'extension', extensionHours: String(hours), paymentMethod }
    });
    if (!created.success) return res.status(502).json({ error: 'Failed to create payment intent', details: created.error?.message });
    const payment = await prisma.payment.create({ data: {
      userId, bookingId, amount, currency: 'PHP', paymentMethod, status: 'pending',
      transactionId: created.paymentIntent.id, purpose: 'extension', extensionHours: hours
    } });
    return res.status(201).json({ paymentId: payment.id, paymentIntentId: payment.transactionId, clientKey: created.paymentIntent.attributes.client_key, publicKey: paymongoService.publicKey, amount, hours, status: created.paymentIntent.attributes.status });
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ error: 'An extension payment is already being processed. Retry to reuse it.' });
    next(error);
  }
};

/**
 * Confirm payment after user completes payment on frontend
 * Called by mobile app after PayMongo payment flow completes
 */
exports.confirmPayment = async (req, res, next) => {
  try {
    const { paymentIntentId } = req.body;
    const userId = req.user.id;

    if (paymentIntentId.startsWith('cash_')) {
      const cashToken = paymentIntentId.replace('cash_', '');
      
      const payment = await prisma.payment.findFirst({
        where: {
          transactionId: paymentIntentId,
          purpose: 'booking'
        },
        include: { 
          booking: {
            include: {
              slot: true
            }
          }
        }
      });
      
      if (!payment) return res.status(404).json({ error: 'Payment not found' });
      
      const booking = payment.booking;
      
      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      
      if (booking.userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      
      const { updatedPayment, updatedBooking } = await prisma.$transaction(async (tx) => {
        const updatedPayment = await tx.payment.update({ where: { id: payment.id }, data: { status: 'pending', paymentMethod: 'cash' } });
        const updatedBooking = await tx.booking.update({ where: { id: booking.id }, data: { status: 'confirmed' } });
        if (booking.status !== 'confirmed' && booking.slot?.ownerId) await tx.notification.create({ data: {
          userId: booking.slot.ownerId, title: 'Booking Confirmed - Cash Payment',
          body: `Booking #${booking.id} confirmed. Guest will pay in cash.`, type: 'booking_confirmed',
          data: JSON.stringify({ bookingId: booking.id, paymentMethod: 'cash' })
        } });
        return { updatedPayment, updatedBooking };
      });

      return res.json({
        message: 'Booking confirmed. Please collect cash payment from customer.',
        payment: updatedPayment,
        booking: updatedBooking
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
        transactionId: paymentIntentId
      },
      include: { booking: true }
    });

    if (!payment || payment.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const attrs = paymentIntent.attributes;
    const expectedCents = Math.round(payment.amount * 100);
    if (Number(attrs.amount) !== expectedCents || String(attrs.currency).toUpperCase() !== payment.currency || payment.currency !== 'PHP') {
      return res.status(409).json({ error: 'Provider payment amount or currency does not match this payment' });
    }
    const metadata = attrs.metadata || {};
    if ((metadata.bookingId && Number(metadata.bookingId) !== payment.bookingId) || (metadata.userId && Number(metadata.userId) !== payment.userId) || (metadata.purpose && metadata.purpose !== payment.purpose) || (payment.purpose === 'extension' && Number(metadata.extensionHours) !== payment.extensionHours)) return res.status(409).json({ error: 'Provider payment metadata does not match this payment' });

     // Update payment status based on PayMongo status
     let paymentStatus = providerPaymentStatus(status);
     let bookingStatus = payment.booking.status;

     if (status === 'succeeded') {
       bookingStatus = 'confirmed';
     } else if (status === 'awaiting_capture') {
       // For manual capture, payment is authorized but not yet captured
       bookingStatus = 'confirmed';
     }

     // Update payment record
       const paymentOutcome = await prisma.$transaction(async (tx) => {
       const fresh = await tx.payment.findUnique({ where: { id: payment.id } });
       // Completed payments are terminal; delayed provider reads cannot downgrade them.
         if (fresh.status === 'completed' && paymentStatus !== 'completed') {
           await tx.booking.update({ where: { id: payment.bookingId }, data: { status: 'confirmed' } });
           return { payment: fresh, status: 'completed' };
         }
       const updated = await tx.payment.update({ where: { id: payment.id }, data: { status: paymentStatus } });
       if (paymentStatus === 'completed' || paymentStatus === 'authorized') await tx.booking.update({ where: { id: payment.bookingId }, data: { status: 'confirmed' } });
         return { payment: updated, status: paymentStatus };
     });
       const updatedPayment = paymentOutcome.payment;
       paymentStatus = paymentOutcome.status;
       if (paymentStatus === 'completed' || paymentStatus === 'authorized') bookingStatus = 'confirmed';

     // Update booking status if payment succeeded or authorized
     if (paymentStatus === 'completed' || paymentStatus === 'authorized') {
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
     next(error);
   }
};

/**
 * Create GCash payment source (for direct GCash payments)
 */
exports.createGCashPayment = async (req, res, next) => {
  res.status(410).json({ error: 'This payment flow has been retired. Use POST /payments/intent and POST /payments/confirm.' });
};

/**
 * Process legacy payment (backward compatibility)
 * TODO: Deprecated - use createPaymentIntent instead
 */
exports.processPayment = async (req, res, next) => {
  res.status(410).json({ error: 'This payment flow has been retired. Use POST /payments/intent and POST /payments/confirm.' });
};

/**
 * Get all payments for the authenticated user
 */
exports.getUserPayments = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const payments = await prisma.payment.findMany({
      where: { userId },
      select: {
        id: true,
        userId: true,
        amount: true,
        paymentMethod: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        booking: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            slot: {
              select: {
                id: true,
                address: true,
                price: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(payments);
   } catch (error) {
     next(error);
   }
};

/**
 * Get a specific payment by ID
 */
exports.getPaymentById = async (req, res, next) => {
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
     next(error);
   }
};

/**
 * Handle PayMongo webhooks
 * Webhook events: payment.paid, payment.failed, source.chargeable
 * Note: This endpoint uses express.raw() so req.body is a Buffer
 */
exports.handleWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['paymongo-signature'];
    const rawBody = req.body.toString('utf-8');

    // Verify webhook signature using RAW body (not re-serialized JSON)
    const isValid = paymongoService.verifyWebhookSignature(rawBody, signature);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Parse JSON payload after signature verification
    const payload = JSON.parse(rawBody);
    const event = payload.data;
    const eventType = event.attributes.type;



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

    }

    res.status(200).json({ received: true });
  } catch (error) {

    next(error);
  }
};

/**
 * Webhook handler: Payment succeeded
 * @private
 */
async function handlePaymentPaid(paymentData) {
  const paymentIntentId = paymentData.attributes.payment_intent_id;
  if (!paymentIntentId) return;
  const verified = await paymongoService.getPaymentIntent(paymentIntentId);
  if (!verified.success || verified.paymentIntent.attributes.status !== 'succeeded') return;

   // Find payment record
   const payment = await prisma.payment.findFirst({
     where: { transactionId: paymentIntentId }
   });

   if (!payment || Number(verified.paymentIntent.attributes.amount) !== Math.round(payment.amount * 100) || String(verified.paymentIntent.attributes.currency).toUpperCase() !== payment.currency) return;

  // Update payment and booking
  let changed = false;
  await prisma.$transaction(async (tx) => {
    const fresh = await tx.payment.findUnique({ where: { id: payment.id } });
    if (fresh.status === 'completed') return;
    await tx.payment.update({ where: { id: payment.id }, data: { status: 'completed' } });
    if (payment.purpose === 'booking') await tx.booking.update({ where: { id: payment.bookingId }, data: { status: 'confirmed' } });
    changed = true;
  });
  if (!changed) return;

  broadcast({
    type: 'payment_completed',
    paymentId: payment.id,
    bookingId: payment.bookingId
  });


}

/**
 * Webhook handler: Payment failed
 * @private
 */
async function handlePaymentFailed(paymentData) {
  const paymentIntentId = paymentData.attributes.payment_intent_id;
  if (!paymentIntentId) return;

  const payment = await prisma.payment.findFirst({
    where: { transactionId: paymentIntentId }
  });

  if (!payment) {

    return;
  }

  if (['completed', 'authorized', 'cancelled'].includes(payment.status)) return;
  await prisma.payment.update({ where: { id: payment.id }, data: { status: 'failed' } });


}

/**
 * Webhook handler: GCash source is chargeable
 * @private
 */
async function handleSourceChargeable(sourceData) {
  const sourceId = sourceData.id;

  // Find payment with this source
  const payment = await prisma.payment.findFirst({
    where: { transactionId: sourceId }
  });

   if (!payment) {
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
        transactionId: result.payment.id
      }
    });


  } else {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'failed' }
    });


  }
}
