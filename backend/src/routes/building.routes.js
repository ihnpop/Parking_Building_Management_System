const express = require('express');
const buildingController = require('../controllers/building.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

const router = express.Router();

// General authentication gate
router.use(authMiddleware.protect);

// Buildings Routing
router.route('/')
  .get(buildingController.getBuildings)
  .post(roleMiddleware.restrictTo('ADMIN', 'MANAGER'), buildingController.createBuilding);

router.route('/:id')
  .put(roleMiddleware.restrictTo('ADMIN', 'MANAGER'), buildingController.updateBuilding);

// Floors Routing (relative to building ID)
router.route('/:buildingId/floors')
  .get(buildingController.getFloors)
  .post(roleMiddleware.restrictTo('ADMIN', 'MANAGER'), buildingController.createFloor);

// Zones Routing (relative to floor ID)
router.route('/floors/:floorId/zones')
  .get(buildingController.getZones)
  .post(roleMiddleware.restrictTo('ADMIN', 'MANAGER'), buildingController.createZone);

module.exports = router;
