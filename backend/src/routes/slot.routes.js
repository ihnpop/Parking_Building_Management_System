const express = require('express');
const slotController = require('../controllers/slot.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');
const queryParser = require('../utils/query-parser');

const router = express.Router();

// General authentication gate
router.use(authMiddleware.protect);

router.route('/')
  .get(queryParser, slotController.getSlots)
  .post(roleMiddleware.restrictTo('ADMIN', 'MANAGER'), slotController.createSlot);

router.route('/:id')
  .get(slotController.getSlotById)
  .put(roleMiddleware.restrictTo('ADMIN', 'MANAGER'), slotController.updateSlot)
  .delete(roleMiddleware.restrictTo('ADMIN'), slotController.deleteSlot);

// Change status (e.g. flag maintenance, available)
router.patch('/:id/status', roleMiddleware.restrictTo('ADMIN', 'MANAGER', 'STAFF'), slotController.updateSlotStatus);

module.exports = router;
