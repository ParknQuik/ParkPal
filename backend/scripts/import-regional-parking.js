require('dotenv').config();
const prisma = require('../config/prisma');
const { refreshRegions } = require('../services/regionalParkingRefresh');
(async () => {
  try {
    if (!process.env.PARKING_EXTRACT_DIRECTORY) throw new Error('PARKING_EXTRACT_DIRECTORY is required');
    const results = await refreshRegions(prisma, process.env.PARKING_EXTRACT_DIRECTORY);
    console.log(JSON.stringify(results));
    if (results.some(result => result.error)) process.exitCode = 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { await prisma.$disconnect(); }
})();
