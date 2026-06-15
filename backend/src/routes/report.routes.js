const express = require('express');
const reportController = require('../controllers/report.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

const router = express.Router();

// General authentication gate
router.use(authMiddleware.protect);

// Analytical dashboard reports restricted strictly to Managers and Admins
router.use(roleMiddleware.restrictTo('ADMIN', 'MANAGER'));

router.get('/summary', reportController.getDashboardSummary);
router.get('/revenue', reportController.getRevenueReport);
router.get('/occupancy', reportController.getOccupancyReport);
router.get('/peak-hours', reportController.getPeakHoursReport);
router.get('/exceptions', reportController.getExceptionsReport);

module.exports = router;
