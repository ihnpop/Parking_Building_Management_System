const express = require('express');
const paymentController = require('../controllers/payment.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');
const queryParser = require('../utils/query-parser');

const router = express.Router();

// General authentication gate
router.use(authMiddleware.protect);

// Financial audit paths restricted strictly to Managers and Admins
router.use(roleMiddleware.restrictTo('ADMIN', 'MANAGER'));

router.route('/')
  .get(queryParser, paymentController.getPayments);

router.route('/:id')
  .get(paymentController.getPaymentById);

module.exports = router;
