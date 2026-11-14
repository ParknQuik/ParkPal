import { completePayMongoCheckout } from '../paymongoCheckout';
import { paymentAPI } from '../api';
import * as WebBrowser from 'expo-web-browser';

jest.mock('../api', () => ({ paymentAPI: { confirmPayment: jest.fn() } }));
jest.mock('expo-web-browser', () => ({ openAuthSessionAsync: jest.fn() }));

const keys = { paymentIntentId: 'pi_test', clientKey: 'pi_test_client', publicKey: 'pk_test' };

describe('completePayMongoCheckout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { id: 'pm_test' } }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { attributes: { status: 'succeeded' } } }) } as Response);
    (paymentAPI.confirmPayment as jest.Mock).mockResolvedValue({ data: { status: 'completed', paymentId: 9 } });
  });

  it('creates and attaches a payment method, then trusts backend confirmation', async () => {
    const result = await completePayMongoCheckout(keys, 'gcash');
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect((global.fetch as jest.Mock).mock.calls[0][1].headers.Authorization).toContain('Basic ');
    expect(paymentAPI.confirmPayment).toHaveBeenCalledWith({ paymentIntentId: 'pi_test' });
    expect(result.status).toBe('completed');
  });

  it('returns canceled without claiming success when the provider redirect is dismissed', async () => {
    (global.fetch as jest.Mock).mockReset()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { id: 'pm_test' } }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { attributes: { status: 'awaiting_next_action', next_action: { redirect: { url: 'https://paymongo.test/redirect' } } } } }) } as Response);
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({ type: 'cancel' });
    const result = await completePayMongoCheckout(keys, 'gcash');
    expect(result.status).toBe('cancelled');
    expect(paymentAPI.confirmPayment).not.toHaveBeenCalled();
  });

  it('preserves pending status from the backend', async () => {
    (paymentAPI.confirmPayment as jest.Mock).mockResolvedValue({ data: { status: 'pending' } });
    const result = await completePayMongoCheckout(keys, 'gcash');
    expect(result.status).toBe('pending');
  });
});
