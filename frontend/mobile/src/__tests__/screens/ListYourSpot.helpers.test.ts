import {
  buildListingCreateData,
  getListingValidationMessage,
  getSubmitErrorMessage,
  uploadAndAttachListingPhotos,
} from '../../utils/listingForm';

describe('ListYourSpot helpers', () => {
  it('keeps local photos out of the create payload', () => {
    const { listingData, localPhotos, remotePhotos } = buildListingCreateData({
      title: 'Driveway Spot',
      description: 'Covered driveway',
      address: '123 Main Street, Makati City',
      latitude: 14.5995,
      longitude: 120.9822,
      price: '75',
      slotType: 'roadside_qr',
      amenities: ['covered'],
      photos: [
        'file:///var/mobile/Containers/Data/photo.jpg',
        'content://media/external/images/media/123',
        'https://storage.googleapis.com/parkpal/listings/1.jpg',
      ],
    });

    expect(listingData.photos).toEqual(['https://storage.googleapis.com/parkpal/listings/1.jpg']);
    expect(localPhotos).toEqual([
      'file:///var/mobile/Containers/Data/photo.jpg',
      'content://media/external/images/media/123',
    ]);
    expect(remotePhotos).toEqual(['https://storage.googleapis.com/parkpal/listings/1.jpg']);
  });

  it('omits photos from the create payload when all photos are local', () => {
    const { listingData, localPhotos } = buildListingCreateData({
      title: 'Driveway Spot',
      description: '',
      address: '123 Main Street, Makati City',
      latitude: 14.5995,
      longitude: 120.9822,
      price: '75',
      slotType: 'roadside_qr',
      amenities: [],
      photos: [
        'file:///var/mobile/Containers/Data/photo.jpg',
        'ph://53F4C6F9-1C3F-4E79-A7F8-11A4F85E7C9A/L0/001',
      ],
    });

    expect(listingData.photos).toBeUndefined();
    expect(localPhotos).toEqual([
      'file:///var/mobile/Containers/Data/photo.jpg',
      'ph://53F4C6F9-1C3F-4E79-A7F8-11A4F85E7C9A/L0/001',
    ]);
  });

  it('mirrors backend validation for short addresses', () => {
    expect(getListingValidationMessage({
      title: 'Driveway Spot',
      address: 'Short',
      price: '75',
      latitude: 14.5995,
      longitude: 120.9822,
    })).toBe('Address must be at least 10 characters.');
  });

  it('surfaces backend validation details from submit errors', () => {
    expect(getSubmitErrorMessage({
      response: {
        data: {
          details: [
            { field: 'photos.0', message: 'Photo must be a valid URL' },
          ],
        },
      },
    })).toBe('Photo must be a valid URL');
  });

  it('uploads local photos after create and attaches uploaded URLs', async () => {
    const uploadListingPhoto = jest.fn()
      .mockResolvedValueOnce({ original: 'https://storage.googleapis.com/parkpal/listings/uploaded-1.jpg' })
      .mockResolvedValueOnce({ original: 'https://storage.googleapis.com/parkpal/listings/uploaded-2.jpg' });
    const updateListing = jest.fn().mockResolvedValue({});

    const result = await uploadAndAttachListingPhotos({
      listingId: 42,
      localPhotos: [
        'file:///var/mobile/Containers/Data/photo-1.jpg',
        'file:///var/mobile/Containers/Data/photo-2.jpg',
      ],
      remotePhotos: ['https://storage.googleapis.com/parkpal/listings/existing.jpg'],
      uploadListingPhoto,
      updateListing,
    });

    expect(uploadListingPhoto).toHaveBeenCalledWith(42, 'file:///var/mobile/Containers/Data/photo-1.jpg');
    expect(uploadListingPhoto).toHaveBeenCalledWith(42, 'file:///var/mobile/Containers/Data/photo-2.jpg');
    expect(updateListing).toHaveBeenCalledWith(42, {
      photos: [
        'https://storage.googleapis.com/parkpal/listings/existing.jpg',
        'https://storage.googleapis.com/parkpal/listings/uploaded-1.jpg',
        'https://storage.googleapis.com/parkpal/listings/uploaded-2.jpg',
      ],
    });
    expect(result).toEqual({
      uploadedUrls: [
        'https://storage.googleapis.com/parkpal/listings/uploaded-1.jpg',
        'https://storage.googleapis.com/parkpal/listings/uploaded-2.jpg',
      ],
      hasFailures: false,
    });
  });

  it('uploads newly added local photos for edit mode and keeps existing remote photos', async () => {
    const uploadListingPhoto = jest.fn()
      .mockResolvedValueOnce({ data: { original: 'https://storage.googleapis.com/parkpal/listings/uploaded-edit.jpg' } });
    const updateListing = jest.fn().mockResolvedValue({});

    const result = await uploadAndAttachListingPhotos({
      listingId: 42,
      localPhotos: ['content://media/external/images/media/456'],
      remotePhotos: ['https://storage.googleapis.com/parkpal/listings/existing-edit.jpg'],
      uploadListingPhoto,
      updateListing,
    });

    expect(uploadListingPhoto).toHaveBeenCalledWith(42, 'content://media/external/images/media/456');
    expect(updateListing).toHaveBeenCalledWith(42, {
      photos: [
        'https://storage.googleapis.com/parkpal/listings/existing-edit.jpg',
        'https://storage.googleapis.com/parkpal/listings/uploaded-edit.jpg',
      ],
    });
    expect(result).toEqual({
      uploadedUrls: ['https://storage.googleapis.com/parkpal/listings/uploaded-edit.jpg'],
      hasFailures: false,
    });
  });

  it('reports upload failures so the screen can show a warning', async () => {
    const uploadError = new Error('Upload URL failed');
    const uploadListingPhoto = jest.fn()
      .mockRejectedValueOnce(uploadError)
      .mockResolvedValueOnce({ original: 'https://storage.googleapis.com/parkpal/listings/uploaded.jpg' });
    const updateListing = jest.fn().mockResolvedValue({});
    const logError = jest.fn();

    const result = await uploadAndAttachListingPhotos({
      listingId: 42,
      localPhotos: [
        'file:///var/mobile/Containers/Data/photo-1.jpg',
        'file:///var/mobile/Containers/Data/photo-2.jpg',
      ],
      remotePhotos: [],
      uploadListingPhoto,
      updateListing,
      logError,
    });

    expect(updateListing).toHaveBeenCalledWith(42, {
      photos: ['https://storage.googleapis.com/parkpal/listings/uploaded.jpg'],
    });
    expect(logError).toHaveBeenCalledWith(
      'Failed to upload listing photo file:///var/mobile/Containers/Data/photo-1.jpg',
      uploadError
    );
    expect(result.hasFailures).toBe(true);
  });

  it('reports a failure when upload response has no usable public original URL', async () => {
    const uploadListingPhoto = jest.fn()
      .mockResolvedValueOnce({ original: 'listings/42/original_123.jpg' })
      .mockResolvedValueOnce({ thumbnail: 'https://storage.googleapis.com/parkpal/listings/thumb.jpg' });
    const updateListing = jest.fn().mockResolvedValue({});

    const result = await uploadAndAttachListingPhotos({
      listingId: 42,
      localPhotos: [
        'content://media/external/images/media/123',
        'file:///var/mobile/Containers/Data/photo.jpg',
      ],
      remotePhotos: ['https://storage.googleapis.com/parkpal/listings/existing.jpg'],
      uploadListingPhoto,
      updateListing,
    });

    expect(updateListing).not.toHaveBeenCalled();
    expect(result).toEqual({
      uploadedUrls: [],
      hasFailures: true,
    });
  });
});
