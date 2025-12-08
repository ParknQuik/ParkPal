/**
 * PayMongo Payment Service
 *
 * Handles all PayMongo API interactions for payment processing
 * Supports: GCash, Credit/Debit Cards, GrabPay, PayMaya
 *
 * Documentation: https://developers.paymongo.com/docs
 */

const axios = require('axios');

class PayMongoService {
  constructor() {
    // PayMongo API configuration
    this.baseUrl = 'https://api.paymongo.com/v1';
    this.secretKey = process.env.PAYMONGO_SECRET_KEY;
    this.publicKey = process.env.PAYMONGO_PUBLIC_KEY;

    if (!this.secretKey) {
      console.warn('⚠️  PAYMONGO_SECRET_KEY not set - payment processing will fail');
    }

    // Create axios instance with auth
    this.client = axios.create({
      baseURL: this.baseUrl,
      auth: {
        username: this.secretKey,
        password: '' // PayMongo uses secret key as username, password empty
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Create a PaymentIntent for a booking
   * @param {Object} params - Payment parameters
   * @param {number} params.amount - Amount in cents (₱100 = 10000)
   * @param {string} params.currency - Currency code (default: PHP)
   * @param {string} params.description - Payment description
   * @param {Object} params.metadata - Additional data (bookingId, userId, etc.)
   * @returns {Promise<Object>} PaymentIntent object
   */
  async createPaymentIntent({ amount, currency = 'PHP', description, metadata = {} }) {
    try {
      // Convert amount to cents (PayMongo requires smallest currency unit)
      const amountInCents = Math.round(amount * 100);

      const response = await this.client.post('/payment_intents', {
        data: {
          attributes: {
            amount: amountInCents,
            currency: currency.toUpperCase(),
            description: description || 'ParkPal Parking Booking',
            statement_descriptor: 'PARKPAL',
            metadata: {
              ...metadata,
              source: 'parkpal-mobile-app'
            },
            // Supported payment methods
            payment_method_allowed: [
              'card',
              'gcash',
              'grab_pay',
              'paymaya'
            ],
            // Capture automatically after authorization
            capture_type: 'automatic'
          }
        }
      });

      return {
        success: true,
        paymentIntent: response.data.data
      };
    } catch (error) {
      console.error('PayMongo createPaymentIntent error:', error.response?.data || error.message);
      return {
        success: false,
        error: this._formatError(error)
      };
    }
  }

  /**
   * Create a PaymentMethod (for saved cards, GCash accounts, etc.)
   * @param {Object} params - Payment method parameters
   * @param {string} params.type - Payment type: 'card', 'gcash', 'grab_pay', 'paymaya'
   * @param {Object} params.details - Payment method details
   * @param {Object} params.billing - Billing information
   * @returns {Promise<Object>} PaymentMethod object
   */
  async createPaymentMethod({ type, details, billing }) {
    try {
      const payload = {
        data: {
          attributes: {
            type,
            billing
          }
        }
      };

      // Add type-specific details
      if (type === 'card') {
        payload.data.attributes.details = details; // { card_number, exp_month, exp_year, cvc }
      } else if (type === 'gcash') {
        // GCash doesn't need additional details
        payload.data.attributes.details = {};
      }

      const response = await this.client.post('/payment_methods', payload);

      return {
        success: true,
        paymentMethod: response.data.data
      };
    } catch (error) {
      console.error('PayMongo createPaymentMethod error:', error.response?.data || error.message);
      return {
        success: false,
        error: this._formatError(error)
      };
    }
  }

  /**
   * Attach a PaymentMethod to a PaymentIntent
   * @param {string} paymentIntentId - PaymentIntent ID
   * @param {string} paymentMethodId - PaymentMethod ID
   * @param {string} returnUrl - URL to redirect after payment (for e-wallets)
   * @returns {Promise<Object>} Updated PaymentIntent
   */
  async attachPaymentMethod(paymentIntentId, paymentMethodId, returnUrl) {
    try {
      const response = await this.client.post(`/payment_intents/${paymentIntentId}/attach`, {
        data: {
          attributes: {
            payment_method: paymentMethodId,
            return_url: returnUrl || `${process.env.FRONTEND_URL || 'http://localhost:19006'}/payment/success`,
            // For GCash, GrabPay - user will be redirected to payment page
          }
        }
      });

      return {
        success: true,
        paymentIntent: response.data.data
      };
    } catch (error) {
      console.error('PayMongo attachPaymentMethod error:', error.response?.data || error.message);
      return {
        success: false,
        error: this._formatError(error)
      };
    }
  }

  /**
   * Retrieve a PaymentIntent by ID
   * @param {string} paymentIntentId - PaymentIntent ID
   * @returns {Promise<Object>} PaymentIntent object
   */
  async getPaymentIntent(paymentIntentId) {
    try {
      const response = await this.client.get(`/payment_intents/${paymentIntentId}`);

      return {
        success: true,
        paymentIntent: response.data.data
      };
    } catch (error) {
      console.error('PayMongo getPaymentIntent error:', error.response?.data || error.message);
      return {
        success: false,
        error: this._formatError(error)
      };
    }
  }

  /**
   * Create a Source (for GCash one-time payments)
   * @param {Object} params - Source parameters
   * @param {number} params.amount - Amount in cents
   * @param {string} params.type - Source type: 'gcash', 'grab_pay'
   * @param {string} params.redirect - Redirect URLs
   * @returns {Promise<Object>} Source object
   */
  async createSource({ amount, type, redirect }) {
    try {
      const amountInCents = Math.round(amount * 100);

      const response = await this.client.post('/sources', {
        data: {
          attributes: {
            amount: amountInCents,
            type,
            currency: 'PHP',
            redirect: redirect || {
              success: `${process.env.FRONTEND_URL || 'http://localhost:19006'}/payment/success`,
              failed: `${process.env.FRONTEND_URL || 'http://localhost:19006'}/payment/failed`
            }
          }
        }
      });

      return {
        success: true,
        source: response.data.data
      };
    } catch (error) {
      console.error('PayMongo createSource error:', error.response?.data || error.message);
      return {
        success: false,
        error: this._formatError(error)
      };
    }
  }

  /**
   * Create a Payment using a Source (for GCash)
   * @param {Object} params - Payment parameters
   * @param {number} params.amount - Amount in cents
   * @param {string} params.sourceId - Source ID from createSource
   * @param {string} params.description - Payment description
   * @returns {Promise<Object>} Payment object
   */
  async createPayment({ amount, sourceId, description }) {
    try {
      const amountInCents = Math.round(amount * 100);

      const response = await this.client.post('/payments', {
        data: {
          attributes: {
            amount: amountInCents,
            currency: 'PHP',
            description: description || 'ParkPal Parking Booking',
            source: {
              id: sourceId,
              type: 'source'
            }
          }
        }
      });

      return {
        success: true,
        payment: response.data.data
      };
    } catch (error) {
      console.error('PayMongo createPayment error:', error.response?.data || error.message);
      return {
        success: false,
        error: this._formatError(error)
      };
    }
  }

  /**
   * Retrieve a Payment by ID
   * @param {string} paymentId - Payment ID
   * @returns {Promise<Object>} Payment object
   */
  async getPayment(paymentId) {
    try {
      const response = await this.client.get(`/payments/${paymentId}`);

      return {
        success: true,
        payment: response.data.data
      };
    } catch (error) {
      console.error('PayMongo getPayment error:', error.response?.data || error.message);
      return {
        success: false,
        error: this._formatError(error)
      };
    }
  }

  /**
   * List all Payments (with pagination)
   * @param {Object} params - Query parameters
   * @param {number} params.limit - Results per page (max 100)
   * @returns {Promise<Object>} List of payments
   */
  async listPayments({ limit = 20 } = {}) {
    try {
      const response = await this.client.get('/payments', {
        params: { limit }
      });

      return {
        success: true,
        payments: response.data.data,
        hasMore: response.data.has_more
      };
    } catch (error) {
      console.error('PayMongo listPayments error:', error.response?.data || error.message);
      return {
        success: false,
        error: this._formatError(error)
      };
    }
  }

  /**
   * Verify webhook signature
   * @param {Object} payload - Webhook payload
   * @param {string} signature - Signature from header
   * @returns {boolean} Is signature valid
   */
  verifyWebhookSignature(payload, signature) {
    const crypto = require('crypto');

    // PayMongo webhook verification
    const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.warn('⚠️  PAYMONGO_WEBHOOK_SECRET not set - webhook verification disabled');
      return true; // Allow in development
    }

    const computedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return computedSignature === signature;
  }

  /**
   * Format PayMongo error for consistent error handling
   * @private
   */
  _formatError(error) {
    if (error.response?.data?.errors) {
      const errors = error.response.data.errors;
      return {
        code: errors[0]?.code || 'PAYMONGO_ERROR',
        message: errors[0]?.detail || 'Payment processing failed',
        details: errors
      };
    }

    return {
      code: 'NETWORK_ERROR',
      message: error.message || 'Failed to connect to payment service',
      details: null
    };
  }

  /**
   * Helper: Convert pesos to cents
   */
  static toCents(amount) {
    return Math.round(amount * 100);
  }

  /**
   * Helper: Convert cents to pesos
   */
  static toPesos(amountInCents) {
    return amountInCents / 100;
  }
}

module.exports = new PayMongoService();
