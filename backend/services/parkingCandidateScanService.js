const axios = require('axios');
const prisma = require('../config/prisma');
const { ApiError } = require('../middleware/errorHandler');

const GOOGLE_PLACES_NEARBY_URL = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
const GOOGLE_SCAN_SOURCE = 'google_places';
const MAX_GOOGLE_RADIUS_METERS = 50000;
const GOOGLE_NON_ERROR_STATUSES = new Set(['OK', 'ZERO_RESULTS']);


const getGooglePlacesApiKey = () => {
  return process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
};

const buildGooglePlacesError = ({
  message = 'Google Places API request failed',
  googleStatus,
  googleMessage,
  httpStatus,
  failureType = 'provider_error',
}) => {
  return new ApiError(502, message, {
    provider: GOOGLE_SCAN_SOURCE,
    failureType,
    ...(googleStatus && { googleStatus }),
    ...(googleMessage && { googleMessage }),
    ...(httpStatus && { httpStatus }),
  });
};

const normalizeGooglePlacesResponse = (data) => {
  const googleStatus = data?.status || 'UNKNOWN';

  if (GOOGLE_NON_ERROR_STATUSES.has(googleStatus)) {
    return data;
  }

  throw buildGooglePlacesError({
    message: 'Google Places Nearby Search failed',
    googleStatus,
    googleMessage: data?.error_message,
  });
};

const clampRadius = (radius) => {
  return Math.min(parseInt(radius, 10), MAX_GOOGLE_RADIUS_METERS);
};

const fetchGoogleNearbyPage = async ({ lat, lon, radius, type }) => {
  const key = getGooglePlacesApiKey();
  if (!key) {
    throw new ApiError(500, 'Google Places API key is not configured', {
      provider: GOOGLE_SCAN_SOURCE,
      failureType: 'configuration_error',
    });
  }

  const params = {
        location: `${lat},${lon}`,
        radius: clampRadius(radius),
        type,
        key,
      };

  let response;
  try {
    response = await axios.get(GOOGLE_PLACES_NEARBY_URL, { params, timeout: 10000 });
  } catch (error) {
    throw buildGooglePlacesError({
      googleStatus: error.response?.data?.status,
      googleMessage: error.response?.data?.error_message,
      httpStatus: error.response?.status,
      failureType: error.response ? 'http_error' : 'network_error',
    });
  }

  return normalizeGooglePlacesResponse(response.data);
};

const scanGoogleParkingCandidatesForPoint = async () => {
  throw new ApiError(410, 'Legacy Google scans are disabled. Use explicit area discovery.');
};

const distanceMeters = (lat1, lon1, lat2, lon2) => {
  const rad = (value) => value * Math.PI / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2
    + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
};

const isInsideViewport = ({ south, west, north, east }, lat, lon) =>
  lat >= south && lat <= north && (west <= east
    ? lon >= west && lon <= east : lon >= west || lon <= east);

const getDiscoveryArea = (params) => {
  if (params.south === undefined) return {
    lat: Number(params.lat), lon: Number(params.lon),
    radiusMeters: clampRadius(Number(params.radius ?? 5) * 1000), bounds: null,
    viewportTooLarge: false,
  };
  const bounds = Object.fromEntries(['south', 'west', 'north', 'east'].map((key) => [key, Number(params[key])]));
  const { south, west, north, east } = bounds;
  const lat = (south + north) / 2;
  const span = east >= west ? east - west : east + 360 - west;
  const lon = ((west + span / 2 + 540) % 360) - 180;
  // Include the farthest corners, rounding up so edge coordinates remain covered.
  const enclosingRadius = Math.ceil(Math.max(distanceMeters(lat, lon, south, west), distanceMeters(lat, lon, north, east)));
  return { lat, lon, bounds, radiusMeters: Math.max(1, Math.min(enclosingRadius, MAX_GOOGLE_RADIUS_METERS)),
    viewportTooLarge: span > 180 || enclosingRadius > MAX_GOOGLE_RADIUS_METERS };
};

const getDriverDiscoveryCandidates = async (params, identity) => {
  const area = getDiscoveryArea(params);
  const metadata = { provider: GOOGLE_SCAN_SOURCE, providerLimited: false, viewportTooLarge: area.viewportTooLarge };
  if (area.viewportTooLarge) return { candidates: [], metadata, area };
  if (!getGooglePlacesApiKey()) throw new ApiError(503, 'Google discovery is not configured');
  await require('./googleDiscoveryQuota').reserve(identity);
  const data = await fetchGoogleNearbyPage({ lat: area.lat, lon: area.lon, radius: area.radiusMeters, type: 'parking' });
  metadata.providerLimited = !!data.next_page_token;
  const places = (data.results || []).slice(0, 20).filter(place => place.place_id);
  const mappings = places.length ? await prisma.parkingCandidate.findMany({
    where: { googlePlaceId: { in: places.map(place => place.place_id) } },
    include: { linkedZone: true },
  }) : [];
  const byId = new Map(mappings.map(candidate => [candidate.googlePlaceId, candidate]));
  const candidates = places.flatMap(place => {
    const candidate = byId.get(place.place_id);
    const latitude = place.geometry?.location?.lat;
    const longitude = place.geometry?.location?.lng;
    if (candidate?.candidateStatus === 'rejected' || !Number.isFinite(latitude) || !Number.isFinite(longitude)
      || (area.bounds && !isInsideViewport(area.bounds, latitude, longitude))) return [];
    const verified = ['geofence_verified', 'commercial_verified'].includes(candidate?.candidateStatus) && !!candidate.linkedZone;
    return [{ id: 'google-' + place.place_id, source: 'google_candidate', category: 'external_preview',
      canBook: false, canShowAnalytics: verified, isPreview: !verified, latitude, longitude,
      title: place.name || 'Parking facility', address: place.vicinity || null, attribution: 'Google Maps',
      zoneId: verified ? candidate.linkedZoneId : null }];
  });
  return { candidates, metadata, area };
};

const expireOldCandidateCoordinates = async () => prisma.parkingCandidate.updateMany({
  where: {
    // A 29-day cutoff leaves a full-day buffer for the once-daily cleanup job.
    scanTimestamp: { lt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000) },
    OR: [{ draftCenterLat: { not: null } }, { draftCenterLon: { not: null } }],
  },
  data: { draftCenterLat: null, draftCenterLon: null },
});

module.exports = {
  getDiscoveryArea,
  isInsideViewport,
  expireOldCandidateCoordinates,
  GOOGLE_SCAN_SOURCE,
  getGooglePlacesApiKey,
  normalizeGooglePlacesResponse,
  scanGoogleParkingCandidatesForPoint,
  getDriverDiscoveryCandidates,
};
