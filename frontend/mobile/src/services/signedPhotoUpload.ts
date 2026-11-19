import { File, UploadType } from 'expo-file-system';

export const photoUploadError = (stage: string, error: unknown): Error => {
  const status = (error as { response?: { status?: number } })?.response?.status;
  return new Error(`Photo upload failed during ${stage}${status ? ` (HTTP ${status})` : ''}. Please try again.`);
};

/** Send the file bytes with the same MIME type used when signing the URL. */
export async function uploadSignedPhoto(uploadUrl: string, imageUri: string, contentType: string): Promise<void> {
  let file: File;
  try {
    file = new File(imageUri);
  } catch (error) {
    throw photoUploadError('image preparation', error);
  }

  try {
    const result = await file.upload(uploadUrl, {
      httpMethod: 'PUT',
      uploadType: UploadType.BINARY_CONTENT,
      mimeType: contentType,
      headers: { 'Content-Type': contentType },
    });
    if (result.status < 200 || result.status >= 300) {
      throw new Error(`Storage transfer failed (HTTP ${result.status}). Please try again.`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Storage transfer failed (HTTP ')) throw error;
    throw photoUploadError('storage transfer', error);
  }
}
