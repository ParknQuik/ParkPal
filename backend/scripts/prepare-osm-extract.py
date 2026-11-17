"""Prepare a complete regional parking snapshot from a Geofabrik PBF.
Requires osmium and shapely in a dedicated Python environment.
Usage: python prepare-osm-extract.py input.osm.pbf output-directory region-code
"""
import json
import sys
import os
import subprocess
import urllib.request
from pathlib import Path
from datetime import datetime, timezone
import osmium
from shapely.geometry import shape

source, output, code = sys.argv[1:]
regions = json.loads(subprocess.check_output(['node', '-e', "console.log(JSON.stringify(require('./backend/config/parkingRegions')))"], cwd=Path(__file__).resolve().parents[2]))
region = regions[code]
if not region['enabled'] or not region['sources']['osm']['enabled']:
    raise ValueError('Region is not enabled')
bounds = region['bounds']
if source == '--download':
    folder = Path(output)
    folder.mkdir(parents=True, exist_ok=True)
    downloaded = folder / f'{code}.osm.pbf'
    temporary_download = downloaded.with_suffix('.download')
    with urllib.request.urlopen(region['sources']['osm']['extractUrl'], timeout=600) as response, temporary_download.open('wb') as destination:
        import shutil
        shutil.copyfileobj(response, destination)
    os.replace(temporary_download, downloaded)
    source = str(downloaded)
features = {}
factory = osmium.geom.GeoJSONFactory()
class Parking(osmium.SimpleHandler):
    def add(self, entity, identity, longitude, latitude):
        if not (bounds['south'] <= latitude <= bounds['north'] and bounds['west'] <= longitude <= bounds['east']):
            return
        features[identity] = {'type': 'Feature', 'id': identity, 'geometry': {'type': 'Point', 'coordinates': [longitude, latitude]}, 'properties': dict(entity.tags)}
    def node(self, node):
        if node.tags.get('amenity') == 'parking' and node.location.valid():
            self.add(node, f'node/{node.id}', node.location.lon, node.location.lat)
    def area(self, area):
        if area.tags.get('amenity') != 'parking':
            return
        polygon = shape(json.loads(factory.create_multipolygon(area)))
        point = polygon.representative_point()
        self.add(area, f"{'way' if area.from_way() else 'relation'}/{area.orig_id()}", point.x, point.y)
Parking().apply_file(source, locations=True, idx='flex_mem')
if not features:
    raise ValueError('No parking features found; refusing empty replacement')
folder = Path(output)
folder.mkdir(parents=True, exist_ok=True)
target = folder / f'{code}.geojson'
temporary = target.with_suffix('.tmp')
temporary.write_text(json.dumps({'type': 'FeatureCollection', 'features': list(features.values()), 'provenance': {'source': 'Geofabrik/OpenStreetMap', 'license': 'ODbL-1.0', 'preparedAt': datetime.now(timezone.utc).isoformat(), 'input': Path(source).name}}))
os.replace(temporary, target)
print(json.dumps({'region': code, 'features': len(features), 'file': str(target)}))
