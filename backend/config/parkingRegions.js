// Activate additional markets only after coverage and licensing review.
module.exports = {
  'ph-metro-manila': {
    enabled: true, country: 'PH', bounds: { south: 14.35, north: 14.8, west: 120.9, east: 121.15 },
    sources: { osm: { enabled: true, extractUrl: 'https://download.geofabrik.de/asia/philippines-latest.osm.pbf', attribution: '© OpenStreetMap contributors', license: 'ODbL-1.0', refreshDays: 7 }, google: { enabled: true, mode: 'viewport', retention: 'place_ids_only' } },
    partnerFreshnessSeconds: 300,
  },
};
