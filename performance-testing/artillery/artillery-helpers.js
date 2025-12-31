/**
 * Artillery helper functions for test scenarios
 * Provides custom functions for request processing
 */

module.exports = {
  /**
   * Generate random string for unique test data
   */
  generateRandomString: (context, events, done) => {
    context.vars.randomString = Math.random().toString(36).substring(7);
    return done();
  },

  /**
   * Generate random number in range
   */
  generateRandomNumber: (context, events, done) => {
    const min = 1;
    const max = 1000;
    context.vars.randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
    return done();
  },

  /**
   * Generate realistic Philippine phone number
   */
  generatePhoneNumber: (context, events, done) => {
    const prefixes = ['917', '918', '919', '920', '921', '922', '923', '924', '925', '926', '927', '928', '929'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
    context.vars.phoneNumber = `+639${prefix}${suffix}`;
    return done();
  },

  /**
   * Generate random coordinates within Metro Manila bounds
   */
  generateManillaCoordinates: (context, events, done) => {
    // Metro Manila approximate bounds
    const latMin = 14.4074;
    const latMax = 14.7680;
    const lngMin = 120.9382;
    const lngMax = 121.1215;

    context.vars.latitude = (Math.random() * (latMax - latMin) + latMin).toFixed(6);
    context.vars.longitude = (Math.random() * (lngMax - lngMin) + lngMin).toFixed(6);
    return done();
  },

  /**
   * Generate future date for bookings
   */
  generateFutureDate: (context, events, done) => {
    const now = new Date();
    const daysAhead = Math.floor(Math.random() * 30) + 1; // 1-30 days ahead
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    context.vars.futureDate = futureDate.toISOString();
    return done();
  },

  /**
   * Log custom metrics
   */
  logCustomMetrics: (requestParams, response, context, ee, next) => {
    if (response.timings) {
      ee.emit('counter', 'custom.response_time', response.timings.phases.total);
    }
    return next();
  },

  /**
   * Before request hook - add timestamp
   */
  beforeRequest: (requestParams, context, ee, next) => {
    context.vars.requestStartTime = Date.now();
    return next();
  },

  /**
   * After response hook - log timing
   */
  afterResponse: (requestParams, response, context, ee, next) => {
    const duration = Date.now() - context.vars.requestStartTime;
    ee.emit('histogram', 'custom.request_duration', duration);
    return next();
  }
};
