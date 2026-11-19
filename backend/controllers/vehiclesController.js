const prisma = require('../config/prisma');
const logger = require('../config/logger');

/**
 * Get all vehicles for current user
 */
exports.getVehicles = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const vehicles = await prisma.vehicle.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json(vehicles);
   } catch (error) {
     next(error);
   }
};

/**
 * Get single vehicle by ID
 */
exports.getVehicle = async (req, res, next) => {
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
        isActive: true,
      },
    });

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    res.json(vehicle);
   } catch (error) {
     next(error);
   }
};

/**
 * Create a new vehicle
 */
exports.createVehicle = async (req, res, next) => {
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

    // Validate license plate format
    const licensePlateRegex = /^[A-Z0-9-]{2,10}$/i;
    if (!licensePlateRegex.test(licensePlate)) {
      return res.status(400).json({ error: 'Invalid license plate format' });
    }

    const normalizedPlate = licensePlate.trim().toUpperCase();
    const existingVehicle = await prisma.vehicle.findUnique({ where: { licensePlate: normalizedPlate } });
    if (existingVehicle && (existingVehicle.userId !== userId || existingVehicle.isActive)) {
      return res.status(400).json({ error: 'License plate already registered' });
    }

    const vehicleData = {
      userId,
      make: make.trim(),
      model: model.trim(),
      year: parseInt(year),
      color: color.trim(),
      licensePlate: normalizedPlate,
      imageUrl: imageUrl?.trim() || null,
    };
    const vehicle = await prisma.$transaction(async (tx) => {
      const vehicleCount = await tx.vehicle.count({ where: { userId, isActive: true } });
      const willBeDefault = Boolean(isDefault) || vehicleCount === 0;
      if (willBeDefault) {
        await tx.vehicle.updateMany({ where: { userId, isActive: true }, data: { isDefault: false } });
      }
      if (existingVehicle) {
        return tx.vehicle.update({
          where: { id: existingVehicle.id },
          data: { ...vehicleData, isActive: true, isDefault: willBeDefault },
        });
      }
      return tx.vehicle.create({ data: { ...vehicleData, isDefault: willBeDefault } });
    });

     res.status(201).json(vehicle);
   } catch (error) {
     next(error);
   }
};

/**
 * Update a vehicle
 */
exports.updateVehicle = async (req, res, next) => {
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
        isActive: true,
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
          licensePlate: licensePlate.trim().toUpperCase(),
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
        where: { userId, isActive: true, NOT: { id: parseInt(id) } },
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
    logger.error('Update vehicle error:', error);
    next(error);
  }
};

/**
 * Archive a vehicle
 */
exports.deleteVehicle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const archived = await prisma.$transaction(async (tx) => {
      const existing = await tx.vehicle.findFirst({ where: { id: parseInt(id), userId, isActive: true } });
      if (!existing) return false;
      await tx.vehicle.update({ where: { id: existing.id }, data: { isActive: false, isDefault: false } });
      if (existing.isDefault) {
        const anotherVehicle = await tx.vehicle.findFirst({
          where: { userId, isActive: true }, orderBy: { createdAt: 'desc' },
        });
        if (anotherVehicle) {
          await tx.vehicle.update({ where: { id: anotherVehicle.id }, data: { isDefault: true } });
        }
      }
      return true;
    });
    if (!archived) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    res.json({ message: 'Vehicle removed successfully' });
  } catch (error) {
    logger.error('Delete vehicle error:', error);
    next(error);
  }
};

/**
 * Set vehicle as default
 */
exports.setDefaultVehicle = async (req, res, next) => {
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
        isActive: true,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Unset all defaults
    await prisma.vehicle.updateMany({
      where: { userId, isActive: true },
      data: { isDefault: false },
    });

    // Set this as default
    const vehicle = await prisma.vehicle.update({
      where: { id: parseInt(id) },
      data: { isDefault: true },
    });

    res.json(vehicle);
  } catch (error) {
    logger.error('Set default vehicle error:', error);
    next(error);
  }
};
