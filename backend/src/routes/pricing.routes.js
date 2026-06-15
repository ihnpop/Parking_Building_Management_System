const express = require('express');
const pricingController = require('../controllers/pricing.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');
const queryParser = require('../utils/query-parser');

const router = express.Router();

// General authentication gate
router.use(authMiddleware.protect);

router.route('/')
  .get(queryParser, pricingController.getPolicies)
  .post(roleMiddleware.restrictTo('ADMIN', 'MANAGER'), pricingController.createPolicy);

router.route('/:id')
  .get(pricingController.getPolicyById)
  .delete(roleMiddleware.restrictTo('ADMIN'), pricingController.deletePolicy);

module.exports = router;
