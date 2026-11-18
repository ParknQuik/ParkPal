import { userAPI } from '../../services/api';
import * as ImageManipulator from 'expo-image-manipulator';
import { uploadProfilePhoto } from '../../services/profilePhotoUpload';

jest.mock('../../services/api', () => ({
  userAPI: {
    getProfileUploadUrl: jest.fn(),
    uploadProfilePicture: jest.fn(),
  },
}));

jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  manipulateAsync: jest.fn(),
}));

const mockedUserAPI = userAPI as jest.Mocked<typeof userAPI>;
const mockedManipulate = ImageManipulator.manipulateAsync as jest.Mock;

describe('uploadProfilePhoto', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedManipulate.mockResolvedValue({ uri: 'file:///normalized.jpg' });
    mockedUserAPI.getProfileUploadUrl.mockResolvedValue({
      data: { uploadUrl: 'https://storage.example/signed', fileName: 'profiles/1/original.jpg', expiresAt: '' },
    } as never);
    mockedUserAPI.uploadProfilePicture.mockResolvedValue({ data: { profileImageUrl: 'https://cdn.example/profile.jpg' } } as never);
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, blob: async () => new Blob(['jpeg']) })
      .mockResolvedValueOnce({ ok: true }) as jest.Mock;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it.each(['file:///camera-photo.heic', 'file:///gallery-photo.png'])(
    'normalizes %s and uploads a JPEG before confirmation', async (uri) => {
      await uploadProfilePhoto(uri);

      expect(mockedManipulate).toHaveBeenCalledWith(uri, [], {
        compress: 0.85,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      expect(mockedUserAPI.getProfileUploadUrl).toHaveBeenCalledWith(expect.stringMatching(/\.jpg$/));
      expect(global.fetch).toHaveBeenLastCalledWith('https://storage.example/signed', expect.objectContaining({
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
      }));
      expect(mockedUserAPI.uploadProfilePicture).toHaveBeenCalledWith('profiles/1/original.jpg');
    }
  );

  it('does not confirm when the normalized image cannot be read', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 404 }) as jest.Mock;

    await expect(uploadProfilePhoto('file:///photo.heic')).rejects.toThrow('Failed to read image (404)');
    expect(mockedUserAPI.uploadProfilePicture).not.toHaveBeenCalled();
  });

  it('does not confirm when the signed upload fails', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, blob: async () => new Blob(['jpeg']) })
      .mockResolvedValueOnce({ ok: false, status: 403 }) as jest.Mock;

    await expect(uploadProfilePhoto('file:///photo.png')).rejects.toThrow('Image upload failed (403)');
    expect(mockedUserAPI.uploadProfilePicture).not.toHaveBeenCalled();
  });
});
