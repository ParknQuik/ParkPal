import { userAPI } from '../../services/api';
import * as ImageManipulator from 'expo-image-manipulator';
import { File } from 'expo-file-system';
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
jest.mock('expo-file-system', () => ({ File: jest.fn(), UploadType: { BINARY_CONTENT: 'binary' } }));

const mockedUserAPI = userAPI as jest.Mocked<typeof userAPI>;
const mockedManipulate = ImageManipulator.manipulateAsync as jest.Mock;
const mockedFile = File as unknown as jest.Mock;
const upload = jest.fn();

describe('uploadProfilePhoto', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedManipulate.mockResolvedValue({ uri: 'file:///normalized.jpg' });
    mockedUserAPI.getProfileUploadUrl.mockResolvedValue({
      data: { uploadUrl: 'https://storage.example/signed', fileName: 'profiles/1/original.jpg', expiresAt: '' },
    } as never);
    mockedUserAPI.uploadProfilePicture.mockResolvedValue({ data: { profileImageUrl: 'https://cdn.example/profile.jpg' } } as never);
    mockedFile.mockImplementation(() => ({ upload }));
    upload.mockResolvedValue({ status: 200 });
  });

  it.each(['file:///camera-photo.heic', 'file:///gallery-photo.png'])(
    'normalizes %s and uploads a JPEG before confirmation', async (uri) => {
      await uploadProfilePhoto(uri);

      expect(mockedManipulate).toHaveBeenCalledWith(uri, [], {
        compress: 0.85,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      expect(mockedUserAPI.getProfileUploadUrl).toHaveBeenCalledWith(expect.stringMatching(/\.jpg$/));
      expect(mockedFile).toHaveBeenCalledWith('file:///normalized.jpg');
      expect(upload).toHaveBeenCalledWith('https://storage.example/signed', {
        httpMethod: 'PUT', uploadType: 'binary', mimeType: 'image/jpeg',
        headers: { 'Content-Type': 'image/jpeg' },
      });
      expect(mockedUserAPI.uploadProfilePicture).toHaveBeenCalledWith('profiles/1/original.jpg');
    }
  );

  it('does not sign when image preparation fails', async () => {
    mockedManipulate.mockRejectedValue(new Error('bad image'));
    await expect(uploadProfilePhoto('file:///photo.heic')).rejects.toThrow('image preparation');
    expect(mockedUserAPI.getProfileUploadUrl).not.toHaveBeenCalled();
    expect(mockedUserAPI.uploadProfilePicture).not.toHaveBeenCalled();
  });

  it('does not confirm when the signed upload fails', async () => {
    upload.mockResolvedValue({ status: 403 });

    await expect(uploadProfilePhoto('file:///photo.png')).rejects.toThrow('Storage transfer failed (HTTP 403)');
    expect(mockedUserAPI.uploadProfilePicture).not.toHaveBeenCalled();
  });

  it('reports a confirmation failure', async () => {
    mockedUserAPI.uploadProfilePicture.mockRejectedValue({ response: { status: 500 } });
    await expect(uploadProfilePhoto('file:///photo.jpg')).rejects.toThrow('confirmation (HTTP 500)');
  });
});
