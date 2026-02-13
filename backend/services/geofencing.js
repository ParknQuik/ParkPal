/**
 * Geofencing Service
 *
 * Handles geofence detection using Turf.js for Service 1 Analytics.
 * Detects when users enter/exit parking zones for circling time tracking.
 */

const { point, polygon } = require('@turf/helpers');
const booleanPointInPolygon = require('@turf/boolean-point-in-polygon').default;
const distance = require('@turf/distance').default;
const circle = require('@turf/circle').default;

class GeofencingService {
  /**
   * Check if a point is inside a zone's geofence
   * @param {number} latitude - User's latitude
   * @param {number} longitude - User's longitude
   * @param {string} geofencePolygonJSON - Zone's geofence polygon (GeoJSON string)
   * @returns {boolean} True if point is inside geofence
   */
  static isPointInZone(latitude, longitude, geofencePolygonJSON) {
    try {
      const pt = point([longitude, latitude]);
      const poly = JSON.parse(geofencePolygonJSON);

      // Convert to Turf polygon if needed
      const turfPolygon = poly.type === 'Polygon'
        ? polygon(poly.coordinates)
        : poly;

      return booleanPointInPolygon(pt, turfPolygon);
    } catch (error) {
      console.error('Geofencing error:', error);
      return false;
    }
  }

  /**
   * Check if a point is inside any of the provided zones
   * @param {number} latitude - User's latitude
   * @param {number} longitude - User's longitude
   * @param {Array} zones - Array of zone objects with geofencePolygon
   * @returns {Object|null} Zone object if inside, null otherwise
   */
  static findZoneForPoint(latitude, longitude, zones) {
    for (const zone of zones) {
      if (this.isPointInZone(latitude, longitude, zone.geofencePolygon)) {
        return zone;
      }
    }
    return null;
  }

  /**
   * Calculate distance between two points in meters
   * @param {number} lat1 - First point latitude
   * @param {number} lon1 - First point longitude
   * @param {number} lat2 - Second point latitude
   * @param {number} lon2 - Second point longitude
   * @returns {number} Distance in meters
   */
  static calculateDistance(lat1, lon1, lat2, lon2) {
    try {
      const from = point([lon1, lat1]);
      const to = point([lon2, lat2]);

      // Returns distance in kilometers, convert to meters
      return distance(from, to, { units: 'meters' });
    } catch (error) {
      console.error('Distance calculation error:', error);
      return null;
    }
  }

  /**
   * Check if user has moved less than threshold (likely parked)
   * @param {Array} recentActivities - Array of activity events with lat/lon
   * @param {number} thresholdMeters - Movement threshold in meters (default 10m)
   * @param {number} timeWindowSeconds - Time window to check (default 60s)
   * @returns {boolean} True if user has moved less than threshold
   */
  static isLocationStationary(recentActivities, thresholdMeters = 10, timeWindowSeconds = 60) {
    if (!recentActivities || recentActivities.length < 2) {
      return false;
    }

    const now = Date.now();
    const windowActivities = recentActivities.filter(activity => {
      const activityTime = new Date(activity.timestamp).getTime();
      return (now - activityTime) <= (timeWindowSeconds * 1000);
    });

    if (windowActivities.length < 2) {
      return false;
    }

    // Get first and last positions in window
    const firstActivity = windowActivities[0];
    const lastActivity = windowActivities[windowActivities.length - 1];

    if (!firstActivity.latitude || !lastActivity.latitude) {
      return false;
    }

    const distanceMoved = this.calculateDistance(
      firstActivity.latitude,
      firstActivity.longitude,
      lastActivity.latitude,
      lastActivity.longitude
    );

    return distanceMoved !== null && distanceMoved < thresholdMeters;
  }

  /**
   * Create a circular geofence polygon from center point and radius
   * @param {number} centerLat - Center latitude
   * @param {number} centerLon - Center longitude
   * @param {number} radiusMeters - Radius in meters
   * @param {number} steps - Number of points in circle (default 64)
   * @returns {string} GeoJSON polygon string
   */
  static createCircularGeofence(centerLat, centerLon, radiusMeters, steps = 64) {
    try {
      const center = point([centerLon, centerLat]);
      const radiusKm = radiusMeters / 1000;
      const circleGeom = circle(center, radiusKm, { steps, units: 'kilometers' });

      return JSON.stringify(circleGeom.geometry);
    } catch (error) {
      console.error('Circular geofence creation error:', error);
      return null;
    }
  }

  /**
   * Validate geofence polygon structure
   * @param {string} geofencePolygonJSON - GeoJSON polygon string
   * @returns {boolean} True if valid
   */
  static isValidGeofence(geofencePolygonJSON) {
    try {
      const polygon = JSON.parse(geofencePolygonJSON);

      // Check if it's a valid GeoJSON polygon
      if (polygon.type !== 'Polygon' || !polygon.coordinates) {
        return false;
      }

      // Must have at least one ring (exterior)
      if (!Array.isArray(polygon.coordinates) || polygon.coordinates.length === 0) {
        return false;
      }

      // Exterior ring must have at least 4 points (triangle + closing point)
      const exteriorRing = polygon.coordinates[0];
      if (!Array.isArray(exteriorRing) || exteriorRing.length < 4) {
        return false;
      }

      // First and last points must be the same (closed polygon)
      const first = exteriorRing[0];
      const last = exteriorRing[exteriorRing.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = GeofencingService;
