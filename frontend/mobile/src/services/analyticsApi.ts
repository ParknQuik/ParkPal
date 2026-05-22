import api from './api';

export const analyticsAPI = {
  // Zone entry - start circling timer
  zoneEnter: (zoneId: number, latitude: number, longitude: number) =>
    api.post('/analytics/zone/enter', { zoneId, latitude, longitude }),

  // Log activity update
  logActivity: (sessionId: number, activityType: string, confidence: number, latitude?: number, longitude?: number) =>
    api.post('/analytics/activity', { sessionId, activityType, confidence, latitude, longitude }),

  // Zone exit - end session
  zoneExit: (sessionId: number, exitTime?: string, parked?: boolean) =>
    api.post('/analytics/zone/exit', { sessionId, exitTime, parked }),

  // Get zone availability + circling time estimate
  getZoneAvailability: (zoneId: number) =>
    api.get(`/analytics/zones/${zoneId}/availability`),

  // Get historical metrics for a zone
  getZoneMetrics: (zoneId: number, period?: string, from?: string, to?: string, limit?: number) =>
    api.get(`/analytics/zones/${zoneId}/metrics`, {
      params: { period, from, to, limit },
    }),

  // Get session details
  getSession: (sessionId: number) =>
    api.get(`/analytics/sessions/${sessionId}`),

  // List all zones
  getZones: (city?: string, type?: string, isActive?: boolean) =>
    api.get('/analytics/zones', { params: { city, type, isActive } }),
};