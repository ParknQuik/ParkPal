const mockState = { invalidImage: false, events: [] };
const mockBucket = {
  file: jest.fn((name) => ({
    name,
    download: jest.fn(async () => [Buffer.from('image bytes')]),
    save: jest.fn(async () => { mockState.events.push('save'); }),
    makePublic: jest.fn(async () => { mockState.events.push('makePublic'); }),
    delete: jest.fn(async () => { mockState.events.push(`delete:${name}`); }),
  })),
  getFiles: jest.fn(async () => [[
    {
      name: 'profiles/7/original_previous.jpg',
      delete: jest.fn(async () => { mockState.events.push('delete:profiles/7/original_previous.jpg'); }),
    },
    { name: 'profiles/7/original_current.jpg' },
  ]]),
};

jest.mock('@google-cloud/storage', () => ({
  Storage: jest.fn().mockImplementation(() => ({ bucket: () => mockBucket })),
}));

jest.mock('sharp', () => jest.fn(() => ({
  resize: jest.fn().mockReturnThis(),
  jpeg: jest.fn().mockReturnThis(),
  toBuffer: jest.fn(async () => {
    if (mockState.invalidImage) throw new Error('unsupported image format');
    return Buffer.from('processed jpeg');
  }),
})));

jest.mock('../config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const { processProfileImage } = require('../services/mediaService');

describe('processProfileImage', () => {
  beforeEach(() => {
    mockState.invalidImage = false;
    mockState.events = [];
    mockBucket.file.mockClear();
    mockBucket.getFiles.mockClear();
  });

  it('returns 400 for invalid image bytes without deleting previous originals', async () => {
    mockState.invalidImage = true;

    await expect(processProfileImage('profiles/7/original_current.jpg', 7))
      .rejects.toMatchObject({ statusCode: 400, message: 'Unsupported or invalid image data' });

    expect(mockBucket.getFiles).not.toHaveBeenCalled();
    expect(mockState.events).toEqual([]);
  });

  it('processes valid JPEG data and only then cleans up older originals', async () => {
    await expect(processProfileImage('profiles/7/original_current.jpg', 7))
      .resolves.toBe('https://storage.googleapis.com/parkpal-dev-photos/profiles/7/profile_200x200.jpg');

    expect(mockState.events).toEqual([
      'save',
      'makePublic',
      'delete:profiles/7/original_previous.jpg',
    ]);
  });
});
