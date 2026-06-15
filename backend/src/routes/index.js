const express = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

const router = express.Router();

// Public Base Diagnostics Endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// Register Module Sub-routers
router.use('/auth', require('./auth.routes'));
router.use('/users', require('./user.routes'));
router.use('/buildings', require('./building.routes'));
router.use('/vehicle-types', require('./vehicle.routes'));
router.use('/slots', require('./slot.routes'));
router.use('/parking-sessions', require('./session.routes'));
router.use('/pricing-policies', require('./pricing.routes'));
router.use('/payments', require('./payment.routes'));
router.use('/exceptions', require('./exception.routes'));
router.use('/reports', require('./report.routes'));

module.exports = router;
