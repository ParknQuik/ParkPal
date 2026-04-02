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
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const { make, model, year, color, licensePlate, imageUrl, isDefault } = req.body;

    if (!make || !model || !year || !color || !licensePlate) {
      return res.status(400).json({ 
        error: 'Missing required fields: make, model, year, color, licensePlate' 
      });
    }

    // Validate year
    const currentYear = new Date().getFullYear();
    if (year < 1900 || year > currentYear + 1) {
      return res.status(400).json({ error: `Year must be between 1900 and ${currentYear + 1}` });
    }

    // Validate license plate format (basic)
    const licensePlateRegex = /^[A-Z0-9-]{2,10}$/i;
    if (!licensePlateRegex.test(licensePlate)) {
      return res.status(400).json({ error: 'Invalid license plate format' });
    }

    // Check if license plate already exists
    const existingVehicle = await prisma.vehicle.findUnique({
      where: { licensePlate },
    });

    if (existingVehicle) {
      return res.status(400).json({ error: 'License plate already registered' });
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.vehicle.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    // If this is the first vehicle, make it default
    const vehicleCount = await prisma.vehicle.count({ where: { userId } });

    const vehicle = await prisma.vehicle.create({
      data: {
        userId,
        make: make.trim(),
        model: model.trim(),
        year: parseInt(year),
        color: color.trim(),
        licensePlate: licensePlate.trim().toUpperCase(),
        imageUrl: imageUrl?.trim() || null,
        isDefault: isDefault || vehicleCount === 0,
      },
    });

    res.status(201).json(vehicle);
  } catch (error) {
    console.error('Create vehicle error:', error);
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
