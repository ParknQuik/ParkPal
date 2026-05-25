const axios = require('axios');
const prisma = require('../config/prisma');
const { ApiError } = require('../middleware/errorHandler');

const GOOGLE_PLACES_NEARBY_URL = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
const GOOGLE_SCAN_SOURCE = 'google_places';
const MAX_GOOGLE_RADIUS_METERS = 50000;
const DEFAULT_MAX_PAGES = 1;
const GOOGLE_PAGE_TOKEN_DELAY_MS = 2000;
const GOOGLE_NON_ERROR_STATUSES = new Set(['OK', 'ZERO_RESULTS']);

const DEFAULT_METRO_MANILA_SCAN_POINTS = [
  { label: 'Makati CBD', lat: 14.5547, lon: 121.0244, radius: 2500, type: 'parking' },
  { label: 'BGC', lat: 14.5503, lon: 121.0497, radius: 2500, type: 'parking' },
  { label: 'Ortigas Center', lat: 14.5869, lon: 121.0614, radius: 2500, type: 'parking' },
  { label: 'Quezon City Triangle', lat: 14.6507, lon: 121.0494, radius: 3000, type: 'parking' },
  { label: 'Manila Bay Area', lat: 14.5361, lon: 120.9822, radius: 3000, type: 'parking' },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

const clampMaxPages = (maxPages = DEFAULT_MAX_PAGES) => {
  const parsed = parseInt(maxPages, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_MAX_PAGES;
  }

  return Math.min(parsed, 3);
};

const buildScanArea = (lat, lon) => `POINT(${lat} ${lon})`;

const fetchGoogleNearbyPage = async ({ lat, lon, radius, type, pageToken }) => {
  const key = getGooglePlacesApiKey();
  if (!key) {
    throw new ApiError(500, 'Google Places API key is not configured', {
      provider: GOOGLE_SCAN_SOURCE,
      failureType: 'configuration_error',
    });
  }

  const params = pageToken
    ? { pagetoken: pageToken, key }
    : {
        location: `${lat},${lon}`,
        radius: clampRadius(radius),
        type,
        key,
      };

  let response;
  try {
    response = await axios.get(GOOGLE_PLACES_NEARBY_URL, { params });
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

const upsertGooglePlaceCandidate = async ({ place, lat, lon, radius }) => {
  if (!place.place_id) {
    return { candidate: null, action: 'skipped' };
  }

  let candidate = await prisma.parkingCandidate.findUnique({
    where: { googlePlaceId: place.place_id },
  });

  const scanArea = buildScanArea(lat, lon);
  const placeLat = place.geometry?.location?.lat;
  const placeLon = place.geometry?.location?.lng;

  if (candidate) {
    candidate = await prisma.parkingCandidate.update({
      where: { id: candidate.id },
      data: {
        scanArea,
        scanSource: GOOGLE_SCAN_SOURCE,
        scanTimestamp: new Date(),
        draftCenterLat: typeof placeLat === 'number' ? placeLat : candidate.draftCenterLat,
        draftCenterLon: typeof placeLon === 'number' ? placeLon : candidate.draftCenterLon,
        draftRadiusMeters: clampRadius(radius),
        updatedAt: new Date(),
      },
    });

    return { candidate, action: 'updated' };
  }

  candidate = await prisma.parkingCandidate.create({
    data: {
      googlePlaceId: place.place_id,
      candidateStatus: 'candidate_preview',
      scanArea,
      scanSource: GOOGLE_SCAN_SOURCE,
      scanTimestamp: new Date(),
      draftCenterLat: typeof placeLat === 'number' ? placeLat : null,
      draftCenterLon: typeof placeLon === 'number' ? placeLon : null,
      draftRadiusMeters: clampRadius(radius),
    },
  });

  return { candidate, action: 'created' };
};

const scanGoogleParkingCandidatesForPoint = async ({
  lat,
  lon,
  radius,
  type = 'parking',
  maxPages = DEFAULT_MAX_PAGES,
}) => {
  const pageLimit = clampMaxPages(maxPages);
  const candidates = [];
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let requestCount = 0;
  let pageToken = null;

  for (let pageIndex = 0; pageIndex < pageLimit; pageIndex += 1) {
    if (pageToken) {
      await sleep(GOOGLE_PAGE_TOKEN_DELAY_MS);
    }

    const data = await fetchGoogleNearbyPage({
      lat,
      lon,
      radius,
      type,
      pageToken,
    });

    requestCount += 1;

    for (const place of data.results || []) {
      const { candidate, action } = await upsertGooglePlaceCandidate({ place, lat, lon, radius });
      if (action === 'created') {
        createdCount += 1;
      } else if (action === 'updated') {
        updatedCount += 1;
      } else {
        skippedCount += 1;
      }

      if (candidate) {
        candidates.push(candidate);
      }
    }

    pageToken = data.next_page_token || null;
    if (!pageToken) {
      break;
    }
  }

  return {
    candidates,
    requestCount,
    createdCount,
    updatedCount,
    skippedCount,
  };
};

const scanGoogleParkingCandidatesForPoints = async ({
  points = DEFAULT_METRO_MANILA_SCAN_POINTS,
  maxPages = DEFAULT_MAX_PAGES,
} = {}) => {
  const totals = {
    candidates: [],
    requestCount: 0,
    createdCount: 0,
    updatedCount: 0,
    skippedCount: 0,
  };

  for (const point of points) {
    const result = await scanGoogleParkingCandidatesForPoint({
      ...point,
      maxPages,
    });

    totals.candidates.push(...result.candidates);
    totals.requestCount += result.requestCount;
    totals.createdCount += result.createdCount;
    totals.updatedCount += result.updatedCount;
    totals.skippedCount += result.skippedCount;
  }

  return totals;
};

module.exports = {
  DEFAULT_METRO_MANILA_SCAN_POINTS,
  GOOGLE_SCAN_SOURCE,
  getGooglePlacesApiKey,
  normalizeGooglePlacesResponse,
  scanGoogleParkingCandidatesForPoint,
  scanGoogleParkingCandidatesForPoints,
};
