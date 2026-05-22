const vehiclesController = require('../controllers/vehiclesController');
const { authenticate } = require('../services/auth');
const { asyncHandler } = require('../middleware/errorHandler');

module.exports = (app) => {
  /**
   * @swagger
   * /vehicles:
   *   get:
   *     summary: Get all vehicles for current user
   *     tags: [Vehicles]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: List of user's vehicles
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Vehicle'
   *   post:
   *     summary: Create a new vehicle
   *     tags: [Vehicles]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - make
   *               - model
   *               - year
   *               - color
   *               - licensePlate
   *             properties:
   *               make:
   *                 type: string
   *                 example: Toyota
   *               model:
   *                 type: string
   *                 example: Vios
   *               year:
   *                 type: integer
   *                 example: 2023
   *               color:
   *                 type: string
   *                 example: Silver
   *               licensePlate:
   *                 type: string
   *                 example: ABC-1234
   *               imageUrl:
   *                 type: string
   *                 example: https://example.com/car.jpg
   *               isDefault:
   *                 type: boolean
   *                 example: false
   *     responses:
   *       201:
   *         description: Vehicle created
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Vehicle'
   */
  app.get('/vehicles', authenticate, asyncHandler(vehiclesController.getVehicles));
  app.post('/vehicles', authenticate, asyncHandler(vehiclesController.createVehicle));

  /**
   * @swagger
   * /vehicles/{id}:
   *   get:
   *     summary: Get a vehicle by ID
   *     tags: [Vehicles]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Vehicle details
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Vehicle'
   *   put:
   *     summary: Update a vehicle
   *     tags: [Vehicles]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               make:
   *                 type: string
   *               model:
   *                 type: string
   *               year:
   *                 type: integer
   *               color:
   *                 type: string
   *               licensePlate:
   *                 type: string
   *               imageUrl:
   *                 type: string
   *               isDefault:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Vehicle updated
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Vehicle'
   *   delete:
   *     summary: Delete a vehicle
   *     tags: [Vehicles]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Vehicle deleted
   */

  app.get('/vehicles/:id', authenticate, asyncHandler(vehiclesController.getVehicle));
  app.put('/vehicles/:id', authenticate, asyncHandler(vehiclesController.updateVehicle));
  app.delete('/vehicles/:id', authenticate, asyncHandler(vehiclesController.deleteVehicle));

  /**
   * @swagger
   * /vehicles/{id}/default:
   *   post:
   *     summary: Set a vehicle as default
   *     tags: [Vehicles]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Default vehicle set
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Vehicle'
   */
  app.post('/vehicles/:id/default', authenticate, asyncHandler(vehiclesController.setDefaultVehicle));
};
