const errorHandler = require('../middleware/errorHandler').errorHandler;

describe('errorHandler Prisma diagnostics', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  let response;
  let req;

  beforeEach(() => {
    process.env.NODE_ENV = 'production';
    req = { method: 'POST', baseUrl: '/api/v1/payments', route: { path: '/intent' }, path: '/intent', url: '/intent?token=secret', user: { id: 42 } };
    response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('returns 500, logs allow-listed Prisma diagnostics, and hides internal details', () => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('column payments.purpose does not exist');
    error.name = 'PrismaClientKnownRequestError';
    error.code = 'P2022';
    error.meta = { modelName: 'Payment', column_name: 'purpose', query: 'SELECT secret' };

    errorHandler(error, req, response, jest.fn());

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      error: { message: 'Database operation failed', statusCode: 500 },
    });
    const logged = log.mock.calls[0][1].databaseError;
    expect(log.mock.calls[0][1].url).toBe('/intent');
    expect(logged).toEqual({
      name: 'PrismaClientKnownRequestError',
      code: 'P2022',
      metadata: { modelName: 'Payment', column_name: 'purpose' },
      operation: 'POST /api/v1/payments/intent',
    });
    expect(JSON.stringify(logged)).not.toContain('SELECT secret');
    expect(JSON.stringify(response.json.mock.calls[0])).not.toContain('purpose');
    log.mockRestore();
  });

  it('preserves known unique and missing-record mappings', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorHandler(Object.assign(new Error('duplicate'), { code: 'P2002', meta: { target: ['email'] } }), req, response, jest.fn());
    expect(response.status).toHaveBeenCalledWith(409);

    response.status.mockClear();
    errorHandler(Object.assign(new Error('missing'), { code: 'P2025' }), req, response, jest.fn());
    expect(response.status).toHaveBeenCalledWith(404);
    warn.mockRestore();
  });
});
