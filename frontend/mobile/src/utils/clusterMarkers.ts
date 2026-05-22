interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface ClusteredMarker {
  id: string | number;
  latitude: number;
  longitude: number;
  isCluster: boolean;
  count: number;
  listings: any[];
}

export function clusterMarkers(
  listings: any[],
  region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number },
  minClusterCount: number = 15
): ClusteredMarker[] {
  if (listings.length < minClusterCount) {
    return listings.map(l => ({
      id: l.id,
      latitude: l.latitude,
      longitude: l.longitude,
      isCluster: false,
      count: 1,
      listings: [l],
    }));
  }

  const cellSize = region.latitudeDelta * 0.3;
  const grid = new Map<string, any[]>();

  for (const listing of listings) {
    const gridX = Math.floor((listing.longitude - region.longitude + 180) / cellSize);
    const gridY = Math.floor((listing.latitude - region.latitude + 90) / cellSize);
    const key = `${gridX},${gridY}`;
    const cell = grid.get(key) || [];
    cell.push(listing);
    grid.set(key, cell);
  }

  const result: ClusteredMarker[] = [];
  for (const [, cellListings] of grid) {
    if (cellListings.length === 1) {
      const l = cellListings[0];
      result.push({
        id: l.id,
        latitude: l.latitude,
        longitude: l.longitude,
        isCluster: false,
        count: 1,
        listings: [l],
      });
    } else {
      const avgLat = cellListings.reduce((sum, l) => sum + l.latitude, 0) / cellListings.length;
      const avgLon = cellListings.reduce((sum, l) => sum + l.longitude, 0) / cellListings.length;
      result.push({
        id: `cluster-${avgLat}-${avgLon}`,
        latitude: avgLat,
        longitude: avgLon,
        isCluster: true,
        count: cellListings.length,
        listings: cellListings,
      });
    }
  }

  return result;
}
