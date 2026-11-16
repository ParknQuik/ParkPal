import { mediaAPI } from '../../services/mediaApi';
import api from '../../services/api';
import * as ImageManipulator from 'expo-image-manipulator';

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));

jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  manipulateAsync: jest.fn(),
}));

const mockedApi = api as jest.Mocked<typeof api>;
const mockedManipulate = ImageManipulator.manipulateAsync as jest.Mock;

describe('mediaAPI.uploadListingPhoto', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.get.mockResolvedValue({
      data: { uploadUrl: 'https://storage.example/signed', fileName: 'stored-photo.jpg' },
    } as never);
    mockedApi.post.mockResolvedValue({ data: { original: 'https://storage.example/photo.jpg' } } as never);
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, blob: async () => new Blob(['image']) })
      .mockResolvedValueOnce({ ok: true }) as jest.Mock;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it.each([
    ['jpg', 'image/jpeg'],
    ['png', 'image/png'],
    ['webp', 'image/webp'],
  ])('signs and uploads %s with %s', async (extension, contentType) => {
    await mediaAPI.uploadListingPhoto(7, `file:///photo.${extension}`);

    expect(mockedApi.get).toHaveBeenCalledWith(
      '/marketplace/listings/7/photos/upload-url',
      { params: expect.objectContaining({ contentType }) }
    );
    expect((global.fetch as jest.Mock).mock.calls[1][1].headers).toEqual({ 'Content-Type': contentType });
    expect(mockedApi.post).toHaveBeenCalledWith('/marketplace/listings/7/photos/confirm', {
      fileName: 'stored-photo.jpg',
    });
  });

  it.each(['heic', 'heif'])('converts %s to JPEG before upload', async (extension) => {
    mockedManipulate.mockResolvedValue({ uri: 'file:///photo-converted.jpg' });

    await mediaAPI.uploadListingPhoto(7, `file:///photo.${extension}`);

    expect(mockedManipulate).toHaveBeenCalledWith(
      `file:///photo.${extension}`,
      [],
      { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
    );
    expect(mockedApi.get).toHaveBeenCalledWith(
      '/marketplace/listings/7/photos/upload-url',
      { params: expect.objectContaining({ fileName: expect.stringMatching(/\.jpg$/), contentType: 'image/jpeg' }) }
    );
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe('file:///photo-converted.jpg');
  });

  it('does not confirm when the storage PUT fails', async () => {
    (global.fetch as jest.Mock)
      .mockReset()
      .mockResolvedValueOnce({ ok: true, blob: async () => new Blob(['image']) })
      .mockResolvedValueOnce({ ok: false, status: 403 });

    await expect(mediaAPI.uploadListingPhoto(7, 'file:///photo.jpg'))
      .rejects.toThrow('Image upload failed (403)');
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it('does not upload or confirm when reading the local image fails', async () => {
    (global.fetch as jest.Mock).mockReset().mockResolvedValueOnce({ ok: false, status: 404 });

    await expect(mediaAPI.uploadListingPhoto(7, 'file:///photo.jpg'))
      .rejects.toThrow('Failed to read image (404)');
    expect((global.fetch as jest.Mock)).toHaveBeenCalledTimes(1);
    expect(mockedApi.post).not.toHaveBeenCalled();
  });
});
