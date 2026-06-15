const express = require('express');
const vehicleController = require('../controllers/vehicle.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

const router = express.Router();

// General authentication gate
router.use(authMiddleware.protect);

router.route('/')
  .get(vehicleController.getVehicleTypes)
  .post(roleMiddleware.restrictTo('ADMIN'), vehicleController.createVehicleType);

router.route('/:id')
  .put(roleMiddleware.restrictTo('ADMIN'), vehicleController.updateVehicleType)
  .delete(roleMiddleware.restrictTo('ADMIN'), vehicleController.deleteVehicleType);

module.exports = router;
