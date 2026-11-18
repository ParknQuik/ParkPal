import * as ImageManipulator from 'expo-image-manipulator';
import { userAPI } from './api';

/** Upload a camera or gallery image using the profile endpoint's JPEG contract. */
export async function uploadProfilePhoto(imageUri: string) {
  const jpeg = await ImageManipulator.manipulateAsync(
    imageUri,
    [],
    { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
  );
  const fileName = `profile-${Date.now()}.jpg`;
  const { data: { uploadUrl, fileName: gcsFileName } } = await userAPI.getProfileUploadUrl(fileName);

  const imageResponse = await fetch(jpeg.uri);
  if (!imageResponse.ok) {
    throw new Error(`Failed to read image (${imageResponse.status})`);
  }

  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg' },
    body: await imageResponse.blob(),
  });
  if (!uploadResponse.ok) {
    throw new Error(`Image upload failed (${uploadResponse.status})`);
  }

  return userAPI.uploadProfilePicture(gcsFileName).then(response => response.data);
}
