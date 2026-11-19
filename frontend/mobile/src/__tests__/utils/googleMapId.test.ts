import { getGoogleMapId } from '../../utils/googleMapId';

describe('getGoogleMapId', () => {
  const previousIos = process.env.EXPO_PUBLIC_GOOGLE_MAP_ID_IOS;
  const previousAndroid = process.env.EXPO_PUBLIC_GOOGLE_MAP_ID_ANDROID;

  afterEach(() => {
    if (previousIos === undefined) delete process.env.EXPO_PUBLIC_GOOGLE_MAP_ID_IOS;
    else process.env.EXPO_PUBLIC_GOOGLE_MAP_ID_IOS = previousIos;
    if (previousAndroid === undefined) delete process.env.EXPO_PUBLIC_GOOGLE_MAP_ID_ANDROID;
    else process.env.EXPO_PUBLIC_GOOGLE_MAP_ID_ANDROID = previousAndroid;
  });

  it('selects the ID for each native platform', () => {
    process.env.EXPO_PUBLIC_GOOGLE_MAP_ID_IOS = ' ios-id ';
    process.env.EXPO_PUBLIC_GOOGLE_MAP_ID_ANDROID = 'android-id';
    expect(getGoogleMapId('ios')).toBe('ios-id');
    expect(getGoogleMapId('android')).toBe('android-id');
    expect(getGoogleMapId('web')).toBeUndefined();
  });

  it('uses the default map when an ID is blank or missing', () => {
    process.env.EXPO_PUBLIC_GOOGLE_MAP_ID_IOS = '  ';
    delete process.env.EXPO_PUBLIC_GOOGLE_MAP_ID_ANDROID;
    expect(getGoogleMapId('ios')).toBeUndefined();
    expect(getGoogleMapId('android')).toBeUndefined();
  });
});
