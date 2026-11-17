# Regional parking directory

Configuration: `backend/config/parkingRegions.js`. Metro Manila is the initial enabled bounding region. The rectangle is a discovery coverage envelope, not an administrative boundary. Additional markets require reviewed geographic coverage and licensing before enabling. Google remains viewport-driven; TomTom and Parkopedia are not enabled. Their market coverage and contractual freshness require review before adding adapters.

## Catalog refresh

Apply the new Prisma migration and generate the client before serving directory queries. The backend reads `PARKING_EXTRACT_DIRECTORY/<regionCode>.geojson` each Monday at 03:00 UTC. Manual refresh: from backend, `node scripts/import-regional-parking.js`. Configure the same directory on each executing instance; use one designated scheduler instance for imports.

With `PARKING_OSM_PYTHON` pointing to a Python environment containing osmium 4.3.2 and shapely 2.2.0, the weekly refresh downloads the configured source URL and runs `backend/scripts/prepare-osm-extract.py` before importing. This local setup uses the ignored `backend/.parking-data/` directory for its environment, extract and source archive. The backend must be running at Monday 03:00 UTC for its in-process schedule to execute. For externally prepared snapshots, omit `PARKING_OSM_PYTHON`.

An external preparation job can alternatively download a current licensed regional OSM extract (for example from https://download.geofabrik.de/), filter `amenity=parking`, clip to the configured coverage envelope, and convert nodes and polygon facilities to representative GeoJSON Points. Preserve `node/ID`, `way/ID`, or `relation/ID` as feature IDs and preserve source tags. Write the complete FeatureCollection atomically to the mounted directory. The importer requires a nonempty snapshot, rejects invalid or duplicate identities and files older than seven days, upserts source identities, and deactivates absent OSM records only after validation, within the same transaction. The importer accepts GeoJSON; the preparation script handles PBF downloads and conversion. Empty snapshots require operator investigation rather than deleting the directory.

OSM records remain in their own source-identifiable table, retain import time and capacity/access tags, and are attributed to OpenStreetMap contributors under ODbL. See https://www.openstreetmap.org/copyright. Retain the original extract in your licensed archive so source data can be made available as required by ODbL; do not merge Google content into this dataset.

## Partner operations

Provision a ParkingPartner through trusted database administration. Generate a cryptographically random token of at least 32 characters; store only its SHA-256 hex digest in `apiKeyHash`, keep the token in the operator secret store, and set `isVerified` only after confirming the operator and facility mapping. Assign `partnerId` on the facility. Rotate by replacing the hash; revoke with `isActive=false` or `isVerified=false`. No public self-verification endpoint exists.

`PUT /api/v1/marketplace/directory/:id/availability` accepts `Authorization: Bearer <token>` and JSON `{ "availableCount": 12, "occupiedCount": 38, "updatedAt": "2026-11-17T10:00:00Z" }`. Counts must be nonnegative database integers; future timestamps are rejected. Atomic updates require matching facility ownership and a strictly newer timestamp. Duplicates, older updates and unmapped IDs return `accepted:false`. Invalid credentials return 401. Counts expire after five minutes in Metro Manila. `partnerAvailability:null` covers missing, expired, revoked, and unverified feeds; discovery remains independently usable.

`GET /api/v1/marketplace/directory/:region` returns up to 1000 active source-attributed previews. The existing discovery endpoint also includes regional records for the requested center and radius. Viewport-triggered Google discovery is a separate local change and is not included in this isolated delivery. Counts remain nested under `partnerAvailability`, independently of `crowdGuidance`; host reservation availability is unchanged. UI counts show the reported source time; refresh the map to retrieve current feed freshness.

This delivery does not change Google discovery or its scheduler. The separate local Google viewport and storage-policy changes must be delivered independently. No additional scheduled Google sweeps are introduced. See https://developers.google.com/maps/documentation/places/web-service/policies.

## Verification boundaries

Service tests use a mocked Prisma interface and no database setup. Deployment still requires applying the migration, supplying a current extract and provisioning verified operators. Actual feed delivery, extract preparation and end-to-end map rendering require environment verification.
