import * as ImageManipulator from 'expo-image-manipulator';
import { userAPI } from './api';
import { photoUploadError, uploadSignedPhoto } from './signedPhotoUpload';

/** Upload a camera or gallery image using the profile endpoint's JPEG contract. */
export async function uploadProfilePhoto(imageUri: string) {
  let jpeg;
  try {
    jpeg = await ImageManipulator.manipulateAsync(
      imageUri, [], { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
    );
  } catch (error) {
    throw photoUploadError('image preparation', error);
  }
  const fileName = `profile-${Date.now()}.jpg`;
  let uploadUrl: string;
  let gcsFileName: string;
  try {
    ({ data: { uploadUrl, fileName: gcsFileName } } = await userAPI.getProfileUploadUrl(fileName));
  } catch (error) {
    throw photoUploadError('signing', error);
  }

  await uploadSignedPhoto(uploadUrl, jpeg.uri, 'image/jpeg');
  try {
    const response = await userAPI.uploadProfilePicture(gcsFileName);
    if (!response.data?.profileImageUrl) {
      throw new Error('Profile confirmation returned no image URL');
    }
    return response.data;
  } catch (error) {
    throw photoUploadError('confirmation', error);
  }
}
