export type ListingSlotType = 'roadside_qr' | 'commercial_manual' | 'commercial_iot';

export const isRemotePhotoUrl = (photo: string) => /^https?:\/\//i.test(photo);

const getUploadedOriginalUrl = (uploadResult: unknown) => {
  const result = uploadResult as {
    original?: unknown;
    data?: { original?: unknown };
  } | null;
  const original = result?.original ?? result?.data?.original;

  return typeof original === 'string' && isRemotePhotoUrl(original)
    ? original
    : null;
};

export const getListingValidationMessage = (values: {
  title: string;
  address: string;
  price: string;
  latitude: number;
  longitude: number;
}) => {
  const priceNumber = Number(values.price);

  if (values.title.trim().length < 3) {
    return 'Spot name must be at least 3 characters.';
  }
  if (values.address.trim().length < 10) {
    return 'Address must be at least 10 characters.';
  }
  if (!values.price.trim() || !Number.isFinite(priceNumber) || priceNumber <= 0 || priceNumber > 10000) {
    return 'Price must be greater than 0 and less than or equal to 10,000.';
  }
  if (!Number.isFinite(values.latitude) || values.latitude < -90 || values.latitude > 90) {
    return 'Latitude must be between -90 and 90.';
  }
  if (!Number.isFinite(values.longitude) || values.longitude < -180 || values.longitude > 180) {
    return 'Longitude must be between -180 and 180.';
  }

  return null;
};

export const buildListingCreateData = (values: {
  title: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  price: string;
  slotType: ListingSlotType;
  amenities: string[];
  photos: string[];
}) => {
  const remotePhotos = values.photos.filter(isRemotePhotoUrl);
  const localPhotos = values.photos.filter(p => !isRemotePhotoUrl(p));

  return {
    listingData: {
      title: values.title.trim(),
      description: values.description.trim(),
      address: values.address.trim(),
      latitude: values.latitude,
      longitude: values.longitude,
      pricePerHour: Number(values.price),
      slotType: values.slotType,
      amenities: values.amenities,
      photos: remotePhotos.length > 0 ? remotePhotos : undefined,
    },
    remotePhotos,
    localPhotos,
  };
};

export const uploadAndAttachListingPhotos = async (values: {
  listingId: number;
  localPhotos: string[];
  remotePhotos: string[];
  uploadListingPhoto: (listingId: number, photoUri: string) => Promise<unknown>;
  updateListing: (listingId: number, data: { photos: string[] }) => Promise<unknown>;
  logError?: (message: string, error: unknown) => void;
}) => {
  const uploadedUrls: string[] = [];
  const failures: unknown[] = [];

  for (const photoUri of values.localPhotos) {
    try {
      const uploadResult = await values.uploadListingPhoto(values.listingId, photoUri);
      const originalUrl = getUploadedOriginalUrl(uploadResult);
      if (originalUrl) {
        uploadedUrls.push(originalUrl);
      } else {
        failures.push(new Error('Upload completed without an original photo URL'));
      }
    } catch (error) {
      failures.push(error);
      values.logError?.(`Failed to upload listing photo ${photoUri}`, error);
    }
  }

  if (uploadedUrls.length > 0) {
    try {
      await values.updateListing(values.listingId, {
        photos: [...values.remotePhotos, ...uploadedUrls],
      });
    } catch (error) {
      failures.push(error);
      values.logError?.('Failed to attach uploaded listing photos', error);
    }
  }

  return {
    uploadedUrls,
    hasFailures: failures.length > 0,
  };
};

export const getSubmitErrorMessage = (error: any) => {
  if (typeof error === 'string') {
    return error;
  }

  const details = error?.response?.data?.details;
  if (Array.isArray(details) && details[0]?.message) {
    return details[0].message;
  }

  return error?.response?.data?.error
    || error?.response?.data?.message
    || error?.message
    || 'Failed to save listing. Please try again.';
};
