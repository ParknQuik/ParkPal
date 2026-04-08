const prisma = require('../config/prisma');

/**
 * Get all vehicles for current user
 */
exports.getVehicles = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const vehicles = await prisma.vehicle.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(vehicles);
  } catch (error) {
    console.error('Get vehicles error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get single vehicle by ID
 */
exports.getVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: parseInt(id),
        userId,
      },
    });

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    res.json(vehicle);
  } catch (error) {
    console.error('Get vehicle error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Create a new vehicle
 */
exports.createVehicle = async (req, res) => {
  try {
    console.log('\n=== CREATE VEHICLE REQUEST ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('User ID:', req.user?.id);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Request headers:', JSON.stringify(req.headers, null, 2));

    const userId = req.user?.id;
    if (!userId) {
      console.log('❌ VALIDATION FAILED: User not authenticated');
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const { make, model, year, color, licensePlate, imageUrl, isDefault } = req.body;

    console.log('\n--- Field Validation ---');
    console.log('make:', typeof make, make ? `"${make}"` : 'MISSING');
    console.log('model:', typeof model, model ? `"${model}"` : 'MISSING');
    console.log('year:', typeof year, year !== undefined ? year : 'MISSING');
    console.log('color:', typeof color, color ? `"${color}"` : 'MISSING');
    console.log('licensePlate:', typeof licensePlate, licensePlate ? `"${licensePlate}"` : 'MISSING');
    console.log('imageUrl:', typeof imageUrl, imageUrl || 'null/undefined');
    console.log('isDefault:', typeof isDefault, isDefault);

    if (!make || !model || !year || !color || !licensePlate) {
      console.log('❌ VALIDATION FAILED: Missing required fields');
      console.log('Field presence check:', {
        make: !!make,
        model: !!model,
        year: !!year,
        color: !!color,
        licensePlate: !!licensePlate
      });
      return res.status(400).json({ 
        error: 'Missing required fields: make, model, year, color, licensePlate' 
      });
    }

    // Validate year
    console.log('\n--- Year Validation ---');
    const currentYear = new Date().getFullYear();
    console.log('Year value:', year, 'Type:', typeof year);
    console.log('Valid range:', `${1900} - ${currentYear + 1}`);
    if (year < 1900 || year > currentYear + 1) {
      console.log(`❌ VALIDATION FAILED: Year ${year} out of range`);
      return res.status(400).json({ error: `Year must be between 1900 and ${currentYear + 1}` });
    }
    console.log('✅ Year validation passed');

    // Validate license plate format (basic)
    console.log('\n--- License Plate Validation ---');
    console.log('License plate value:', `"${licensePlate}"`);
    const licensePlateRegex = /^[A-Z0-9-]{2,10}$/i;
    const formatValid = licensePlateRegex.test(licensePlate);
    console.log('Format validation result:', formatValid);
    if (!formatValid) {
      console.log('❌ VALIDATION FAILED: Invalid license plate format');
      return res.status(400).json({ error: 'Invalid license plate format' });
    }
    console.log('✅ License plate format validation passed');

    // Check if license plate already exists
    console.log('\n--- Duplicate Check ---');
    console.log('Checking for existing license plate:', licensePlate);
    const existingVehicle = await prisma.vehicle.findUnique({
      where: { licensePlate },
    });
    console.log('Existing vehicle found:', existingVehicle ? 'YES' : 'NO');
    if (existingVehicle) {
      console.log('❌ VALIDATION FAILED: License plate already registered');
      console.log('Existing vehicle details:', JSON.stringify(existingVehicle, null, 2));
      return res.status(400).json({ error: 'License plate already registered' });
    }
    console.log('✅ No duplicate found');

    // If setting as default, unset other defaults
    console.log('\n--- Default Flag Handling ---');
    console.log('isDefault:', isDefault);
    if (isDefault) {
      console.log('Unsetting other default vehicles for user:', userId);
      await prisma.vehicle.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
      console.log('✅ Other defaults unset');
    }

    // If this is the first vehicle, make it default
    console.log('\n--- First Vehicle Check ---');
    const vehicleCount = await prisma.vehicle.count({ where: { userId } });
    console.log('User vehicle count:', vehicleCount);
    const willBeDefault = isDefault || vehicleCount === 0;
    console.log('Will be default:', willBeDefault);

    console.log('\n--- Creating Vehicle ---');
    const vehicleData = {
      userId,
      make: make.trim(),
      model: model.trim(),
      year: parseInt(year),
      color: color.trim(),
      licensePlate: licensePlate.trim().toUpperCase(),
      imageUrl: imageUrl?.trim() || null,
      isDefault: willBeDefault,
    };
    console.log('Vehicle data to create:', JSON.stringify(vehicleData, null, 2));

    const vehicle = await prisma.vehicle.create({
      data: vehicleData,
    });

    console.log('✅ Vehicle created successfully');
    console.log('Created vehicle:', JSON.stringify(vehicle, null, 2));
    console.log('=== END CREATE VEHICLE ===\n');

    res.status(201).json(vehicle);
  } catch (error) {
    console.error('\n❌❌❌ CREATE VEHICLE ERROR ❌❌❌');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error stack:', error.stack);
    console.error('Full error:', JSON.stringify(error, null, 2));
    console.error('=== END ERROR ===\n');
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update a vehicle
 */
exports.updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const { make, model, year, color, licensePlate, imageUrl, isDefault } = req.body;

    // Check ownership
    const existing = await prisma.vehicle.findFirst({
      where: {
        id: parseInt(id),
        userId,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Validate year if provided
    if (year) {
      const currentYear = new Date().getFullYear();
      if (year < 1900 || year > currentYear + 1) {
        return res.status(400).json({ error: `Year must be between 1900 and ${currentYear + 1}` });
      }
    }

    // Validate license plate if provided
    if (licensePlate) {
      const licensePlateRegex = /^[A-Z0-9-]{2,10}$/i;
      if (!licensePlateRegex.test(licensePlate)) {
        return res.status(400).json({ error: 'Invalid license plate format' });
      }

      // Check if license plate already exists (excluding current vehicle)
      const duplicate = await prisma.vehicle.findFirst({
        where: {
          licensePlate,
          NOT: { id: parseInt(id) },
        },
      });

      if (duplicate) {
        return res.status(400).json({ error: 'License plate already registered' });
      }
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.vehicle.updateMany({
        where: { userId, NOT: { id: parseInt(id) } },
        data: { isDefault: false },
      });
    }

    const vehicle = await prisma.vehicle.update({
      where: { id: parseInt(id) },
      data: {
        ...(make && { make: make.trim() }),
        ...(model && { model: model.trim() }),
        ...(year && { year: parseInt(year) }),
        ...(color && { color: color.trim() }),
        ...(licensePlate && { licensePlate: licensePlate.trim().toUpperCase() }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl?.trim() || null }),
        ...(isDefault !== undefined && { isDefault }),
      },
    });

    res.json(vehicle);
  } catch (error) {
    console.error('Update vehicle error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete a vehicle
 */
exports.deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Check ownership
    const existing = await prisma.vehicle.findFirst({
      where: {
        id: parseInt(id),
        userId,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    await prisma.vehicle.delete({
      where: { id: parseInt(id) },
    });

    // If deleted vehicle was default, set another as default
    if (existing.isDefault) {
      const anotherVehicle = await prisma.vehicle.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      if (anotherVehicle) {
        await prisma.vehicle.update({
          where: { id: anotherVehicle.id },
          data: { isDefault: true },
        });
      }
    }

    res.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    console.error('Delete vehicle error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Set vehicle as default
 */
exports.setDefaultVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Check ownership
    const existing = await prisma.vehicle.findFirst({
      where: {
        id: parseInt(id),
        userId,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Unset all defaults
    await prisma.vehicle.updateMany({
      where: { userId },
      data: { isDefault: false },
    });

    // Set this as default
    const vehicle = await prisma.vehicle.update({
      where: { id: parseInt(id) },
      data: { isDefault: true },
    });

    res.json(vehicle);
  } catch (error) {
    console.error('Set default vehicle error:', error);
    res.status(500).json({ error: error.message });
  }
};
