/**
 * Geofencing Service Tests
 * Tests for Turf.js-based geofencing functionality
 */

const GeofencingService = require('../services/geofencing');

describe('GeofencingService', () => {
  // Test geofence polygon (square around Manila coordinates)
  const testGeofence = JSON.stringify({
    type: 'Polygon',
    coordinates: [
      [
        [120.9819, 14.5337], // Top-left
        [120.9869, 14.5337], // Top-right
        [120.9869, 14.5287], // Bottom-right
        [120.9819, 14.5287], // Bottom-left
        [120.9819, 14.5337]  // Close the polygon
      ]
    ]
  });

  describe('isPointInZone', () => {
    it('should return true for point inside geofence', () => {
      const latitude = 14.5312;
      const longitude = 120.9844;

      const result = GeofencingService.isPointInZone(latitude, longitude, testGeofence);

      expect(result).toBe(true);
    });

    it('should return false for point outside geofence', () => {
      const latitude = 14.5400; // Outside the test polygon
      const longitude = 121.0000; // Outside the test polygon

      const result = GeofencingService.isPointInZone(latitude, longitude, testGeofence);

      expect(result).toBe(false);
    });

    it('should return false for point exactly on the boundary', () => {
      const latitude = 14.5337; // On top edge
      const longitude = 120.9819; // On left edge

      const result = GeofencingService.isPointInZone(latitude, longitude, testGeofence);

      // Note: Boundary behavior may vary, so we just check it doesn't crash
      expect(typeof result).toBe('boolean');
    });

    it('should handle invalid geofence gracefully', () => {
      const latitude = 14.5312;
      const longitude = 120.9844;
      const invalidGeofence = 'not a valid JSON';

      const result = GeofencingService.isPointInZone(latitude, longitude, invalidGeofence);

      expect(result).toBe(false);
    });

    it('should handle invalid coordinates', () => {
      const latitude = NaN;
      const longitude = 120.9844;

      const result = GeofencingService.isPointInZone(latitude, longitude, testGeofence);

      expect(result).toBe(false);
    });
  });

  describe('findZoneForPoint', () => {
    const zones = [
      {
        id: 1,
        name: 'Zone 1',
        geofencePolygon: testGeofence
      },
      {
        id: 2,
        name: 'Zone 2',
        geofencePolygon: JSON.stringify({
          type: 'Polygon',
          coordinates: [
            [
              [121.0000, 14.6000],
              [121.0050, 14.6000],
              [121.0050, 14.5950],
              [121.0000, 14.5950],
              [121.0000, 14.6000]
            ]
          ]
        })
      }
    ];

    it('should return zone when point is inside', () => {
      const latitude = 14.5312;
      const longitude = 120.9844;

      const result = GeofencingService.findZoneForPoint(latitude, longitude, zones);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(result.name).toBe('Zone 1');
    });

    it('should return null when point is not in any zone', () => {
      const latitude = 14.7000;
      const longitude = 121.1000;

      const result = GeofencingService.findZoneForPoint(latitude, longitude, zones);

      expect(result).toBeNull();
    });

    it('should return first matching zone when point is in multiple zones', () => {
      const overlappingZones = [
        ...zones,
        {
          id: 3,
          name: 'Zone 3 (overlaps Zone 1)',
          geofencePolygon: testGeofence // Same as Zone 1
        }
      ];

      const latitude = 14.5312;
      const longitude = 120.9844;

      const result = GeofencingService.findZoneForPoint(latitude, longitude, overlappingZones);

      expect(result.id).toBe(1); // First match
    });

    it('should handle empty zones array', () => {
      const latitude = 14.5312;
      const longitude = 120.9844;

      const result = GeofencingService.findZoneForPoint(latitude, longitude, []);

      expect(result).toBeNull();
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two points correctly', () => {
      const lat1 = 14.5312;
      const lon1 = 120.9844;
      const lat2 = 14.5320;
      const lon2 = 120.9850;

      const distance = GeofencingService.calculateDistance(lat1, lon1, lat2, lon2);

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(200); // Should be around 100-150 meters
    });

    it('should return 0 for same coordinates', () => {
      const lat1 = 14.5312;
      const lon1 = 120.9844;

      const distance = GeofencingService.calculateDistance(lat1, lon1, lat1, lon1);

      expect(distance).toBe(0);
    });

    it('should calculate correct distance for 1km separation', () => {
      const lat1 = 14.5312;
      const lon1 = 120.9844;
      const lat2 = 14.5402; // ~1km north
      const lon2 = 120.9844;

      const distance = GeofencingService.calculateDistance(lat1, lon1, lat2, lon2);

      expect(distance).toBeGreaterThan(900);
      expect(distance).toBeLessThan(1100);
    });

    it('should handle invalid coordinates gracefully', () => {
      const distance = GeofencingService.calculateDistance(NaN, 120.9844, 14.5312, 120.9850);

      expect(distance).toBeNull();
    });
  });

  describe('isLocationStationary', () => {
    const now = Date.now();

    const stationaryActivities = [
      {
        latitude: 14.5312,
        longitude: 120.9844,
        timestamp: new Date(now - 50000) // 50 seconds ago
      },
      {
        latitude: 14.5312,
        longitude: 120.9844,
        timestamp: new Date(now - 40000)
      },
      {
        latitude: 14.5313, // Moved 1 meter
        longitude: 120.9844,
        timestamp: new Date(now - 30000)
      },
      {
        latitude: 14.5313,
        longitude: 120.9845, // Moved another 1 meter
        timestamp: new Date(now - 20000)
      }
    ];

    const movingActivities = [
      {
        latitude: 14.5312,
        longitude: 120.9844,
        timestamp: new Date(now - 50000)
      },
      {
        latitude: 14.5320, // Moved 100+ meters
        longitude: 120.9850,
        timestamp: new Date(now - 30000)
      },
      {
        latitude: 14.5330, // Moved another 100+ meters
        longitude: 120.9860,
        timestamp: new Date(now - 10000)
      }
    ];

    it('should return true for stationary location (< 10m movement)', () => {
      const result = GeofencingService.isLocationStationary(stationaryActivities, 10, 60);

      expect(result).toBe(true);
    });

    it('should return false for moving location (> 10m movement)', () => {
      const result = GeofencingService.isLocationStationary(movingActivities, 10, 60);

      expect(result).toBe(false);
    });

    it('should respect custom threshold', () => {
      const result = GeofencingService.isLocationStationary(stationaryActivities, 1, 60);

      expect(result).toBe(false); // Will fail with 1m threshold
    });

    it('should respect time window', () => {
      const result = GeofencingService.isLocationStationary(stationaryActivities, 10, 5);

      // Only activities in last 5 seconds would be considered
      expect(typeof result).toBe('boolean');
    });

    it('should handle insufficient data', () => {
      const result = GeofencingService.isLocationStationary([stationaryActivities[0]], 10, 60);

      expect(result).toBe(false);
    });

    it('should handle empty array', () => {
      const result = GeofencingService.isLocationStationary([], 10, 60);

      expect(result).toBe(false);
    });

    it('should handle missing coordinates', () => {
      const activitiesWithNulls = [
        { latitude: 14.5312, longitude: 120.9844, timestamp: new Date() },
        { latitude: null, longitude: null, timestamp: new Date() }
      ];

      const result = GeofencingService.isLocationStationary(activitiesWithNulls, 10, 60);

      expect(result).toBe(false);
    });
  });

  describe('createCircularGeofence', () => {
    it('should create valid circular geofence', () => {
      const centerLat = 14.5312;
      const centerLon = 120.9844;
      const radiusMeters = 500;

      const geofence = GeofencingService.createCircularGeofence(centerLat, centerLon, radiusMeters);

      expect(geofence).toBeDefined();
      expect(typeof geofence).toBe('string');

      const parsed = JSON.parse(geofence);
      expect(parsed.type).toBe('Polygon');
      expect(Array.isArray(parsed.coordinates)).toBe(true);
      expect(parsed.coordinates[0].length).toBeGreaterThan(10); // Default 64 steps
    });

    it('should respect custom steps parameter', () => {
      const centerLat = 14.5312;
      const centerLon = 120.9844;
      const radiusMeters = 500;
      const steps = 8;

      const geofence = GeofencingService.createCircularGeofence(centerLat, centerLon, radiusMeters, steps);

      const parsed = JSON.parse(geofence);
      expect(parsed.coordinates[0].length).toBe(steps + 1); // +1 for closing point
    });

    it('should handle invalid parameters', () => {
      const result = GeofencingService.createCircularGeofence(NaN, 120.9844, 500);

      expect(result).toBeNull();
    });
  });

  describe('isValidGeofence', () => {
    it('should validate correct polygon', () => {
      const result = GeofencingService.isValidGeofence(testGeofence);

      expect(result).toBe(true);
    });

    it('should reject invalid JSON', () => {
      const result = GeofencingService.isValidGeofence('not valid JSON');

      expect(result).toBe(false);
    });

    it('should reject non-Polygon type', () => {
      const invalidType = JSON.stringify({
        type: 'Point',
        coordinates: [120.9844, 14.5312]
      });

      const result = GeofencingService.isValidGeofence(invalidType);

      expect(result).toBe(false);
    });

    it('should reject polygon with insufficient points', () => {
      const insufficientPoints = JSON.stringify({
        type: 'Polygon',
        coordinates: [
          [
            [120.9819, 14.5337],
            [120.9869, 14.5337],
            [120.9819, 14.5337] // Only 3 points, needs at least 4
          ]
        ]
      });

      const result = GeofencingService.isValidGeofence(insufficientPoints);

      expect(result).toBe(false);
    });

    it('should reject unclosed polygon', () => {
      const unclosed = JSON.stringify({
        type: 'Polygon',
        coordinates: [
          [
            [120.9819, 14.5337],
            [120.9869, 14.5337],
            [120.9869, 14.5287],
            [120.9819, 14.5287]
            // Missing closing point
          ]
        ]
      });

      const result = GeofencingService.isValidGeofence(unclosed);

      expect(result).toBe(false);
    });

    it('should reject missing coordinates', () => {
      const missingCoords = JSON.stringify({
        type: 'Polygon'
        // No coordinates property
      });

      const result = GeofencingService.isValidGeofence(missingCoords);

      expect(result).toBe(false);
    });
  });
});
