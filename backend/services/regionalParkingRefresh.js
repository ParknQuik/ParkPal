const fs = require('fs/promises');
const path = require('path');
const { promisify } = require('util');
const execFile = promisify(require('child_process').execFile);
const regions = require('../config/parkingRegions');
const { importOsm } = require('./regionalParkingService');
// Files are supplied by the trusted extract preparation job, never by an API caller.
async function refreshRegions(prisma, directory, now = new Date()) {
  if (!directory) return [];
  const results = [];
  for (const [code, region] of Object.entries(regions)) {
    if (!region.enabled || !region.sources.osm.enabled) continue;
    try {
      if (process.env.PARKING_OSM_PYTHON) {
        await execFile(process.env.PARKING_OSM_PYTHON, [path.join(__dirname, '../scripts/prepare-osm-extract.py'), '--download', directory, code], { timeout: 1800000 });
      }
      const file = path.join(directory, `${code}.geojson`);
      const stat = await fs.stat(file);
      if (now - stat.mtime > region.sources.osm.refreshDays * 86400000) throw new Error('Extract is stale');
      const collection = JSON.parse(await fs.readFile(file, 'utf8'));
      results.push({ region: code, ...await importOsm(prisma, code, collection, now) });
    } catch (error) {
      results.push({ region: code, error: error.message });
    }
  }
  return results;
}
module.exports = { refreshRegions };
