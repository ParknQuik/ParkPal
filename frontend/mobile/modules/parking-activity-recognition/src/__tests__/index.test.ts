const mockNativeModule = {
  requestPermission: jest.fn(),
  startActivityUpdates: jest.fn(),
  stopActivityUpdates: jest.fn(),
  addListener: jest.fn(),
};
const mockRequireOptionalNativeModule = jest.fn((_moduleName: string) => mockNativeModule);
let api: typeof import('..');

beforeAll(() => {
  jest.doMock('expo-modules-core', () => ({
    requireOptionalNativeModule: (moduleName: string) => mockRequireOptionalNativeModule(moduleName),
  }));
  api = require('..');
});

describe('parking activity recognition bridge', () => {
  const remove = jest.fn();
  const callback = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireOptionalNativeModule.mockReturnValue(mockNativeModule);
    mockNativeModule.requestPermission.mockResolvedValue(true);
    mockNativeModule.startActivityUpdates.mockResolvedValue(undefined);
    mockNativeModule.stopActivityUpdates.mockResolvedValue(undefined);
    mockNativeModule.addListener.mockReturnValue({ remove });
  });

  it('passes through the native permission result', async () => {
    await expect(api.requestPermission()).resolves.toBe(true);
    expect(mockNativeModule.requestPermission).toHaveBeenCalledTimes(1);
  });

  it('registers the listener before native updates and removes both on stop', async () => {
    await api.startActivityUpdates(callback);

    expect(mockNativeModule.addListener).toHaveBeenCalledWith('onActivity', callback);
    expect(mockNativeModule.startActivityUpdates).toHaveBeenCalledTimes(1);

    await api.stopActivityUpdates();
    expect(remove).toHaveBeenCalledTimes(1);
    expect(mockNativeModule.stopActivityUpdates).toHaveBeenCalledTimes(2);
  });

  it('removes the JS listener if native startup rejects', async () => {
    mockNativeModule.startActivityUpdates.mockRejectedValueOnce(new Error('not authorized'));

    await expect(api.startActivityUpdates(callback)).rejects.toThrow('not authorized');
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
