import { mediaAPI } from '../../services/mediaApi';
import api from '../../services/api';
import * as ImageManipulator from 'expo-image-manipulator';
import { File } from 'expo-file-system';

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));

jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  manipulateAsync: jest.fn(),
}));
jest.mock('expo-file-system', () => ({ File: jest.fn(), UploadType: { BINARY_CONTENT: 'binary' } }));

const mockedApi = api as jest.Mocked<typeof api>;
const mockedManipulate = ImageManipulator.manipulateAsync as jest.Mock;
const mockedFile = File as unknown as jest.Mock;
const upload = jest.fn();

describe('mediaAPI.uploadListingPhoto', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.get.mockResolvedValue({
      data: { uploadUrl: 'https://storage.example/signed', fileName: 'stored-photo.jpg' },
    } as never);
    mockedApi.post.mockResolvedValue({ data: { original: 'https://storage.example/photo.jpg' } } as never);
    mockedFile.mockImplementation(() => ({ upload }));
    upload.mockResolvedValue({ status: 200 });
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
    expect(upload).toHaveBeenCalledWith('https://storage.example/signed', {
      httpMethod: 'PUT', uploadType: 'binary', mimeType: contentType,
      headers: { 'Content-Type': contentType },
    });
    expect(mockedApi.post).toHaveBeenCalledWith('/marketplace/listings/7/photos/confirm', {
      fileName: 'stored-photo.jpg',
    });
  });

  it.each(['heic', 'heif', 'gif'])('converts %s to JPEG before upload', async (extension) => {
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
    expect(mockedFile).toHaveBeenCalledWith('file:///photo-converted.jpg');
  });

  it('does not confirm when the storage PUT fails', async () => {
    upload.mockResolvedValue({ status: 403 });

    await expect(mediaAPI.uploadListingPhoto(7, 'file:///photo.jpg'))
      .rejects.toThrow('Storage transfer failed (HTTP 403)');
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it('does not confirm when native file upload fails', async () => {
    upload.mockRejectedValue(new Error('native failure at https://storage.example/signed?secret=token'));

    const error = await mediaAPI.uploadListingPhoto(7, 'file:///photo.jpg').catch(error => error);
    expect(error.message).toContain('storage transfer');
    expect(error.message).not.toContain('secret=token');
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it('accepts any successful storage response before confirming', async () => {
    upload.mockResolvedValue({ status: 204 });

    await mediaAPI.uploadListingPhoto(7, 'file:///photo.jpg');

    expect(mockedApi.post).toHaveBeenCalledWith('/marketplace/listings/7/photos/confirm', {
      fileName: 'stored-photo.jpg',
    });
  });

  it.each(['jpg', 'png', 'webp'])('normalizes slot %s to signed JPEG and confirms after the native PUT', async (extension) => {
    mockedApi.post.mockResolvedValueOnce({ data: { uploadUrl: 'https://storage.example/signed', fileName: 'slot-photo.jpg' } } as never)
      .mockResolvedValueOnce({ data: { id: 1 } } as never);
    await mediaAPI.uploadPhoto(3, `file:///photo.${extension}`);
    expect(mockedApi.post).toHaveBeenNthCalledWith(1, '/media/upload-url', {
      slotId: 3, fileName: expect.stringMatching(/\.jpg$/),
    });
    expect(mockedFile).toHaveBeenCalledWith('file:///photo-converted.jpg');
    expect(upload).toHaveBeenCalledWith('https://storage.example/signed', expect.objectContaining({
      mimeType: 'image/jpeg', headers: { 'Content-Type': 'image/jpeg' },
    }));
    expect(mockedApi.post).toHaveBeenCalledTimes(2);
  });
});
